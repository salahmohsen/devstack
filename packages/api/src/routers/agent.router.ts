import { ORPCError, streamToEventIterator } from "@orpc/server";
import { z } from "zod";

import {
  DetectStacksClientInputSchema,
  llmRequestContextFields,
  type OrpcContext
} from "@tsu-stack/core";
import {
  projectStackScanRepository,
  stackDependencyRepository,
  stackRepository
} from "@tsu-stack/db/repositories";
import {
  getPrivateRepoFileContent,
  getPrivateRepoTree,
  getRepoFileContent,
  getRepoTree
} from "@tsu-stack/github";

import { sseByteStreamToUIMessageChunkStream } from "#@/lib/agent/sse-to-ui-message-stream";
import {
  abortPromise,
  cancelMastraWorkflowRun,
  streamMastraWorkflow
} from "#@/lib/agent/workflow-stream";
import { protectedProcedure } from "#@/lib/procedures/factory";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

// Parse GitHub URL to owner/repo format
function parseGitHubRepo(url: string): string {
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|$)/);
  return match ? match[1] : url;
}

/**
 * Parse Mastra workflow streams of concatenated JSON objects (NOT SSE).
 * String-aware so braces inside SVG icons / messages do not split events.
 */
async function* parseConcatenatedJsonStream(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const drainCompleteObjects = function* (): Generator<unknown> {
    let i = 0;
    while (i < buffer.length) {
      while (i < buffer.length && /\s/.test(buffer[i]!)) i++;
      if (i >= buffer.length) {
        buffer = "";
        return;
      }
      if (buffer[i] !== "{") {
        i++;
        continue;
      }

      let depth = 0;
      let inString = false;
      let escaped = false;
      const start = i;

      for (; i < buffer.length; i++) {
        const ch = buffer[i]!;
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === "\\") {
            escaped = true;
          } else if (ch === '"') {
            inString = false;
          }
          continue;
        }

        if (ch === '"') {
          inString = true;
        } else if (ch === "{") {
          depth++;
        } else if (ch === "}") {
          depth--;
          if (depth === 0) {
            const slice = buffer.slice(start, i + 1);
            try {
              yield JSON.parse(slice) as unknown;
            } catch {
              // Ignore malformed JSON fragments
            }
            i++;
            buffer = buffer.slice(i);
            i = 0;
            break;
          }
        }
      }

      // Incomplete object — keep remainder for the next chunk
      if (depth > 0 || inString) {
        buffer = buffer.slice(start);
        return;
      }
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      yield* drainCompleteObjects();
    }

    buffer += decoder.decode();
    yield* drainCompleteObjects();

    if (buffer.trim().length > 0) {
      try {
        yield JSON.parse(buffer) as unknown;
      } catch {
        // Ignore malformed trailing data
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Detect the default branch for a repo via GitHub API.
 * Tries private token first, falls back to public.
 * Returns "main" as ultimate fallback.
 */
async function getDefaultBranch(repoSlug: string, context: OrpcContext): Promise<string> {
  const tryOctokit = async (octokit: OrpcContext["github"]["privateOctokit"]) => {
    try {
      const [owner, repo] = repoSlug.split("/");
      const { data } = await octokit.rest.repos.get({ owner, repo });
      return data.default_branch as string;
    } catch {
      return null;
    }
  };

  const branch = await tryOctokit(context.github.privateOctokit);
  if (branch) return branch;
  const publicBranch = await tryOctokit(context.github.publicOctokit);
  return publicBranch ?? "main";
}

/**
 * Parse pnpm-workspace.yaml content and extract workspace glob patterns.
 * Handles standard format: `packages:\n  - "pattern"\n  - pattern`
 */
function parsePnpmWorkspaceYaml(content: string): string[] {
  const patterns: string[] = [];
  const lines = content.split("\n");
  let inPackages = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("#") || trimmed === "") continue;

    if (/^packages\s*:/.test(trimmed)) {
      inPackages = true;
      continue;
    }

    if (inPackages && /^[a-zA-Z]/.test(trimmed) && !trimmed.startsWith("-")) {
      inPackages = false;
    }

    if (inPackages && trimmed.startsWith("-")) {
      const pattern = trimmed
        .slice(1)
        .trim()
        .replace(/^["']|["']$/g, "");
      if (pattern) patterns.push(pattern);
    }
  }

  return patterns;
}

/**
 * Resolve pnpm-workspace.yaml patterns to actual workspace package.json files.
 * Uses the GitHub tree API to list directories and find package.json files.
 */
async function resolveWorkspacePackageJsons(
  workspaceYamlContent: string,
  repoSlug: string,
  defaultBranch: string,
  context: OrpcContext
): Promise<Array<{ workspace: string; content: string }>> {
  const patterns = parsePnpmWorkspaceYaml(workspaceYamlContent);
  if (patterns.length === 0) return [];

  // Extract unique base directories from patterns (e.g., "packages/*" -> "packages")
  const baseDirs = new Set<string>();
  for (const pattern of patterns) {
    const baseDir = pattern.replace(/\/?\*+$/, "").replace(/\/$/, "");
    baseDirs.add(baseDir); // "" means root directory
  }

  const fetchTree = async (path: string) => {
    const privateResult = await getPrivateRepoTree(
      { path, ref: defaultBranch, repo: repoSlug },
      context
    );
    if (privateResult.length > 0) return privateResult;
    return getRepoTree({ path, ref: defaultBranch, repo: repoSlug }, context);
  };

  const fetchFile = async (path: string) => {
    const privateResult = await getPrivateRepoFileContent(
      { path, ref: defaultBranch, repo: repoSlug },
      context
    );
    if (privateResult !== null) return privateResult;
    return getRepoFileContent({ path, ref: defaultBranch, repo: repoSlug }, context);
  };

  const results: Array<{ workspace: string; content: string }> = [];

  for (const baseDir of baseDirs) {
    const entries = await fetchTree(baseDir);
    const dirs = entries.filter((e) => e.type === "dir");

    for (const dir of dirs) {
      const pkgPath = `${dir.path}/package.json`;
      const content = await fetchFile(pkgPath);
      if (content) {
        results.push({ workspace: dir.name, content });
      }
    }
  }

  return results;
}

const agentIdSchema = z.string().default("weather-agent");

const messagesSchema = z.array(
  z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string()
  })
);

// AI SDK UIMessage[] — typed as `z.array(z.any())` to avoid leaking
// AI SDK types into the input contract. The client passes whatever
// `useChat` gives it.
const uiMessagesSchema = z.array(z.any());

export const agentRouter = {
  /**
   * Non-streaming chat. Returns the full response once it's ready.
   * Useful for non-UI callers (cron jobs, form enhance, one-shot tooling).
   *
   * The `text` field is populated for plain-text agent output. If a
   * future agent uses structured output, `text` may be empty — fall
   * back to `object` stringified as a safety net.
   */
  chat: protectedProcedure
    .route({
      description: "Send a message to the agent and get a non-streaming response",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema,
        messages: messagesSchema
      })
    )
    .output(z.object({ content: z.string() }))
    .handler(async ({ input, context }) => {
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const llm = await resolveRuntimeAiCredentials(context.session.user.id, "hubChat");
      if (!llm.apiKey) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
        });
      }

      const userId = context.session.user.id;
      const threadId = `dashboard-home:${userId}`;
      // Memory requires top-level threadId/resourceId (not only requestContext).
      // Per-call `model` survives auth middleware requestContext priority.
      const response = await context.agentWorker.fetch(`/agents/${input.agentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: input.messages,
          threadId,
          resourceId: userId,
          model: { id: llm.modelId, apiKey: llm.apiKey },
          requestContext: {
            userId,
            resourceId: userId,
            threadId,
            ...llmRequestContextFields(llm)
          }
        })
      });

      if (!response.ok) {
        const body = await response.text();
        throw new Error(`Agent returned ${response.status}: ${body}`);
      }

      const data = (await response.json()) as {
        text?: string;
        object?: unknown;
      };
      return {
        content: data.text ?? (data.object != null ? JSON.stringify(data.object) : "")
      };
    }),

  /**
   * Streaming chat. Hits the agent's `/chat/:agentId` endpoint
   * exposed by `@mastra/ai-sdk`'s `chatRoute()` (registered in the
   * agent's Mastra config). Mastra emits AI SDK UIMessageStream SSE
   * bytes; we parse those into JSON chunk objects and pipe them
   * through oRPC's EventIterator via `streamToEventIterator`.
   *
   * The client must use `eventIteratorToUnproxiedDataStream` and
   * return that stream **directly** to `useChat` — no TextDecoder /
   * SSE re-parse on the client (oRPC AI SDK integration docs).
   *
   * The v6 `chatRoute` is configured in the agent worker and the
   * v6 native tool-approval flow uses the same transport for both
   * initial messages and approval resume. The handler attaches the
   * authenticated user as `requestContext` so the supervisor's
   * `Memory` and approval snapshots key on the user/thread.
   *
   * NOTE: Mastra's built-in `/agents/:agentId/stream/ui` is
   * deprecated in v1.50.1 — use this path instead.
   */
  chatStream: protectedProcedure
    .route({
      description: "Stream a chat response from the agent as an event iterator",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema,
        messages: uiMessagesSchema
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const llm = await resolveRuntimeAiCredentials(context.session.user.id, "hubChat");
      if (!llm.apiKey) {
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
        });
      }

      const userId = context.session.user.id;
      const threadId = `dashboard-home:${userId}`;
      // chatRoute params = AgentExecutionOptions + messages.
      // Memory needs top-level threadId/resourceId; auth middleware may override
      // body requestContext, so also pass model as a top-level execution option.
      const upstream = await context.agentWorker.fetch(`/chat/${input.agentId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Id": userId,
          "X-Thread-Id": threadId
        },
        body: JSON.stringify({
          messages: input.messages,
          threadId,
          resourceId: userId,
          model: { id: llm.modelId, apiKey: llm.apiKey },
          requestContext: {
            userId,
            resourceId: userId,
            threadId,
            ...llmRequestContextFields(llm)
          }
        })
      });

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        // Surface agent body (Memory / BYO / provider errors) instead of opaque 500.
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message:
            body.trim().length > 0
              ? `Hub agent error (${upstream.status}): ${body.slice(0, 400)}`
              : `Hub agent returned ${upstream.status} with an empty body`
        });
      }

      // Parse Mastra SSE → UIMessageChunk objects, then hand oRPC an
      // object stream. Do NOT pipe raw Uint8Array SSE frames — those
      // rehydrate as non-ArrayBuffer values and break TextDecoder on
      // the client.
      return streamToEventIterator(sseByteStreamToUIMessageChunkStream(upstream.body));
    }),

  /**
   * List suspended (paused) runs on a thread. Called lazily from
   * the dashboard home — once on mount when `messages.length === 0` —
   * to surface a "Resume previous conversation" banner if the user
   * has a pending tool-approval from a prior session. Not a polling
   * endpoint.
   */
  listSuspendedRuns: protectedProcedure
    .route({
      description: "List suspended runs on a thread for HITL resume",
      method: "POST"
    })
    .input(
      z.object({
        agentId: z.string().default("hub-supervisor"),
        threadId: z.string().min(1),
        resourceId: z.string().min(1)
      })
    )
    .output(
      z.array(
        z.object({
          runId: z.string(),
          toolCalls: z.array(
            z.object({
              toolCallId: z.string(),
              toolName: z.string(),
              args: z.record(z.string(), z.unknown()),
              requiresApproval: z.boolean()
            })
          )
        })
      )
    )
    .handler(async ({ input, context }) => {
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const upstream = await context.agentWorker.fetch(
        `/agents/${input.agentId}/suspended-runs?threadId=${encodeURIComponent(input.threadId)}&resourceId=${encodeURIComponent(input.resourceId)}`
      );
      if (!upstream.ok) {
        const body = await upstream.text();
        throw new Error(`List suspended returned ${upstream.status}: ${body}`);
      }
      return (await upstream.json()) as Array<{
        runId: string;
        toolCalls: Array<{
          toolCallId: string;
          toolName: string;
          args: Record<string, unknown>;
          requiresApproval: boolean;
        }>;
      }>;
    }),

  /**
   * Explicitly cancel a Mastra workflow run by id.
   * Prefer this from the client in addition to aborting the event stream —
   * request disconnect alone is not always enough to stop in-flight steps.
   */
  cancelWorkflowRun: protectedProcedure
    .route({
      description: "Cancel a Mastra workflow run (POST .../runs/:runId/cancel)",
      method: "POST"
    })
    .input(
      z.object({
        workflowId: z.string().min(1),
        runId: z.string().min(1)
      })
    )
    .output(
      z.object({
        success: z.boolean(),
        status: z.number(),
        detail: z.string().optional()
      })
    )
    .handler(async ({ input, context }) => {
      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Agent worker is not configured. Set AGENT_WORKER_URL and restart the server."
        });
      }
      const result = await cancelMastraWorkflowRun(
        agentWorker,
        input.workflowId,
        input.runId,
        context.logger
      );
      return {
        success: result.ok,
        status: result.status,
        detail: result.ok ? undefined : result.body
      };
    }),

  /**
   * Detect stacks from project repos via Mastra workflow.
   * Streams workflow events for progress tracking.
   * Scoped to the session user's stacks (tenant userId).
   */
  detectStacks: protectedProcedure
    .route({
      description: "Detect stacks from project repos via Mastra workflow",
      method: "POST"
    })
    .input(DetectStacksClientInputSchema)
    .handler(async function* ({ input, context, signal }) {
      try {
        if (signal?.aborted) return;

        // Yield immediately so the oRPC event stream is live and client cancel
        // can close the generator (otherwise cancel waits on GitHub prefetch).
        yield {
          type: "workflow-step-start",
          payload: {
            stepName: "fetch-repo-package-jsons",
            id: "fetch-repo-package-jsons",
            status: "running"
          }
        };

        if (signal?.aborted) return;

        // 1. Pre-fetch package.json from each repo (abortable)
        const repoPackages = await Promise.race([
          Promise.all(
            input.repos.map(async (repoUrl: string) => {
              if (signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
              }
              const repoSlug = parseGitHubRepo(repoUrl);

              // Detect default branch (private first, then public)
              const defaultBranch = await getDefaultBranch(repoSlug, context);

              if (signal?.aborted) {
                throw new DOMException("Aborted", "AbortError");
              }

              const fetchFile = async (path: string) => {
                const privateResult = await getPrivateRepoFileContent(
                  { path, ref: defaultBranch, repo: repoSlug },
                  context
                );
                if (privateResult !== null) return privateResult;
                const publicResult = await getRepoFileContent(
                  { path, ref: defaultBranch, repo: repoSlug },
                  context
                );
                return publicResult;
              };

              const rootPkgContent = await fetchFile("package.json");

              // Only try workspace yaml if package.json was found
              let workspaceYamlContent: string | null = null;
              let workspacePkgContents: Array<{ workspace: string; content: string }> = [];
              if (rootPkgContent) {
                workspaceYamlContent = await fetchFile("pnpm-workspace.yaml");
                if (workspaceYamlContent) {
                  workspacePkgContents = await resolveWorkspacePackageJsons(
                    workspaceYamlContent,
                    repoSlug,
                    defaultBranch,
                    context
                  );
                }
              }

              return {
                repo: repoUrl,
                rootPkgContent,
                workspaceYamlContent,
                workspacePkgContents
              };
            })
          ),
          abortPromise(signal)
        ]);

        if (signal?.aborted) return;

        const reposWithPackageJson = repoPackages.filter((r) => r.rootPkgContent != null);
        if (reposWithPackageJson.length === 0) {
          throw new ORPCError("BAD_REQUEST", {
            message:
              "Could not read package.json from any selected repository (GitHub 401/404). " +
              "Sign out and sign back in with GitHub so the server can refresh your OAuth token " +
              "(private repos need a valid owner OAuth session; tokens never leave the server)."
          });
        }

        // 2. Look up existing stacks, dependencies, and last scan
        const userId = context.session.user.id;
        const existingStacks = await stackRepository.findAllByUserId(userId);

        const existingDependencies = await stackDependencyRepository.findByStackIds(
          existingStacks.map((s) => s.id)
        );

        // New (unsaved) projects pass an empty projectId — skip scan lookup.
        const lastScan =
          input.projectId.length > 0
            ? await projectStackScanRepository.findLatestByProjectId(input.projectId)
            : null;

        // 3. Build DetectStacksWorkflowInputSchema payload
        const workflowInput = {
          projectId: input.projectId || "draft",
          repoPackages,
          existingStacks: existingStacks.map((stack) => {
            return {
              id: stack.id,
              name: stack.name
            };
          }),
          existingDependencies: existingDependencies.map((dep) => {
            return {
              npmPackage: dep.npmPackage,
              stackId: dep.stackId
            };
          }),
          lastScan: lastScan
            ? {
                detectedPackages: lastScan.detectedPackages ?? []
              }
            : null,
          llm: await resolveRuntimeAiCredentials(context.session.user.id, "stacks")
        };

        if (signal?.aborted) return;

        // 4. Stream workflow execution — cancels Mastra run on client abort
        const agentWorker = context.agentWorker;
        if (!agentWorker) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Agent worker is not configured. Set AGENT_WORKER_URL and restart the server."
          });
        }

        try {
          yield* streamMastraWorkflow({
            agentWorker,
            workflowId: "detect-stacks-workflow",
            inputData: workflowInput,
            signal,
            parseStream: parseConcatenatedJsonStream,
            logger: context.logger
          });
        } catch (error) {
          if (signal?.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          const detail = error instanceof Error ? error.message : String(error);
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: `Cannot reach agent worker: ${detail}`
          });
        }
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (error instanceof ORPCError) throw error;
        const message = error instanceof Error ? error.message : String(error);
        const cause =
          error instanceof Error && error.cause instanceof Error
            ? error.cause.message
            : error instanceof Error && error.cause != null
              ? typeof error.cause === "string"
                ? error.cause
                : JSON.stringify(error.cause)
              : null;
        context.logger.error(error instanceof Error ? error : message);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: cause ? `${message}\nCaused by: ${cause}` : message || "Stack detection failed"
        });
      }
    }),

  /**
   * Organize stacks — merge duplicates, rename, enrich metadata.
   * Streams workflow events for progress tracking.
   * Scoped to the session user's stacks (tenant userId).
   */
  organizeStacks: protectedProcedure
    .route({
      description: "Organize stacks — merge duplicates, rename, enrich metadata",
      method: "POST"
    })
    .input(z.object({}))
    .handler(async function* ({ context, signal }) {
      // 1. Fetch all existing stacks for the session user
      const userId = context.session.user.id;
      const allStacks = await stackRepository.findAllByUserId(userId);

      // 2. Build workflow input
      const workflowInput = {
        stacks: allStacks.map((stack) => {
          return {
            id: stack.id,
            name: stack.name,
            type: stack.type,
            description: stack.description,
            icon: stack.icon,
            projectCount: stack.projectCount ?? 0
          };
        }),
        llm: await resolveRuntimeAiCredentials(userId, "stacks")
      };

      // 3. Stream workflow execution — cancels Mastra run on client abort
      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new Error("agentWorker not configured");
      }

      if (signal?.aborted) {
        return;
      }

      yield* streamMastraWorkflow({
        agentWorker,
        workflowId: "organize-stacks-workflow",
        inputData: workflowInput,
        signal,
        parseStream: parseConcatenatedJsonStream,
        logger: context.logger
      });
    })
};
