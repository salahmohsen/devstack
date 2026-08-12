import { ORPCError, streamToEventIterator } from "@orpc/server";
import { z } from "zod";

import {
  DetectStacksClientInputSchema,
  llmLogFields,
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

import {
  CHAT_ALLOWED_AGENT_IDS,
  HUB_CHAT_AGENT_ID,
  HUB_CHAT_MAX_STEPS,
  hubChatMemoryOptions,
  hubChatThreadId,
  isChatAllowedAgentId,
  slimMessagesForHubMemory
} from "#@/lib/agent/hub-memory";
import { parseConcatenatedJsonStream } from "#@/lib/agent/parse-workflow-json-stream";
import { sseByteStreamToUIMessageChunkStream } from "#@/lib/agent/sse-to-ui-message-stream";
import { assertWorkflowRunOwner } from "#@/lib/agent/workflow-run-registry";
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
 * Parse Mastra worker JSON without throwing on Studio HTML SPA fallbacks.
 * Wrong paths (missing `/api` prefix) return `<!doctype html>...` with status 200.
 */
function parseAgentJsonBody(bodyText: string, label: string): unknown {
  const trimmed = bodyText.trim();
  if (!trimmed) return undefined;
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    console.debug(`[agent.router] ${label}: invalid JSON body`, trimmed.slice(0, 120));
    return undefined;
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

const agentIdSchema = z.enum(CHAT_ALLOWED_AGENT_IDS).default(HUB_CHAT_AGENT_ID);

const messagesSchema = z.array(
  z.object({
    role: z.enum(["user", "assistant", "system"]),
    content: z.string()
  })
);

// AI SDK UIMessage[] — typed as `z.array(z.any())` to avoid leaking
// AI SDK types into the input contract. The client passes whatever
// `useChat` gives it. Cap length to reduce abuse surface.
const uiMessagesSchema = z.array(z.any()).max(80);

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
      const byo = llmLogFields(llm);
      if (!llm.apiKey) {
        context.logger.set({
          event: "agent_hub_chat_missing_byo",
          route: "agent.chat",
          agentId: input.agentId,
          ...byo
        });
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
        });
      }

      const userId = context.session.user.id;
      const threadId = hubChatThreadId(userId);
      let response: Response;
      try {
        // Built-in Mastra routes mount under default apiPrefix `/api`.
        response = await context.agentWorker.fetch(`/api/agents/${input.agentId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: input.messages,
            ...hubChatMemoryOptions(userId),
            maxSteps: HUB_CHAT_MAX_STEPS,
            model: { id: llm.modelId, apiKey: llm.apiKey },
            requestContext: {
              userId,
              ...llmRequestContextFields(llm)
            }
          })
        });
      } catch (error) {
        context.logger.set({
          event: "agent_hub_chat_failed",
          route: "agent.chat",
          agentId: input.agentId,
          threadId,
          ...byo
        });
        throw error instanceof Error ? error : new Error(String(error));
      }

      if (!response.ok) {
        const body = await response.text();
        context.logger.set({
          event: "agent_hub_chat_upstream_error",
          route: "agent.chat",
          agentId: input.agentId,
          threadId,
          status: response.status,
          bodyPreview: body.slice(0, 200),
          ...byo
        });
        throw new Error(`Agent returned ${response.status}: ${body.slice(0, 200)}`);
      }

      const data = (await response.json()) as {
        text?: string;
        object?: unknown;
      };
      const content = data.text ?? (data.object != null ? JSON.stringify(data.object) : "");
      context.logger.set({
        event: "agent_hub_chat_ok",
        route: "agent.chat",
        agentId: input.agentId,
        threadId,
        messageCount: input.messages.length,
        contentLength: content.length,
        ...byo
      });
      return { content };
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
        messages: uiMessagesSchema,
        /** AI SDK Chat transport trigger — used to slim messages for Memory. */
        trigger: z.enum(["submit-message", "regenerate-message"]).optional()
      })
    )
    .handler(async ({ input, context, signal }) => {
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const llm = await resolveRuntimeAiCredentials(context.session.user.id, "hubChat");
      const byo = llmLogFields(llm);
      if (!llm.apiKey) {
        context.logger.set({
          event: "agent_hub_chat_stream_missing_byo",
          route: "agent.chatStream",
          agentId: input.agentId,
          ...byo
        });
        throw new ORPCError("BAD_REQUEST", {
          message:
            "Configure an AI provider API key in Settings → AI before using Hub chat (BYO keys)."
        });
      }

      const userId = context.session.user.id;
      const threadId = hubChatThreadId(userId);
      const trigger = input.trigger ?? "submit-message";
      // Defense-in-depth: Memory owns history — never forward full UI transcript.
      const messages = slimMessagesForHubMemory(input.messages as unknown[], trigger);
      let upstream: Response;
      try {
        upstream = await context.agentWorker.fetch(`/chat/${input.agentId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-User-Id": userId,
            "X-Thread-Id": threadId
          },
          body: JSON.stringify({
            messages,
            trigger,
            ...hubChatMemoryOptions(userId),
            maxSteps: HUB_CHAT_MAX_STEPS,
            model: { id: llm.modelId, apiKey: llm.apiKey },
            requestContext: {
              userId,
              ...llmRequestContextFields(llm)
            }
          }),
          // Forward client stop/abort so the agent worker request cancels.
          signal
        });
      } catch (error) {
        if (signal?.aborted || (error instanceof Error && error.name === "AbortError")) {
          context.logger.set({
            event: "agent_hub_chat_stream_aborted",
            route: "agent.chatStream",
            agentId: input.agentId,
            threadId,
            ...byo
          });
          throw error instanceof Error ? error : new Error("Aborted");
        }
        context.logger.set({
          event: "agent_hub_chat_stream_failed",
          route: "agent.chatStream",
          agentId: input.agentId,
          threadId,
          ...byo
        });
        throw error instanceof Error ? error : new Error(String(error));
      }

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        context.logger.set({
          event: "agent_hub_chat_stream_upstream_error",
          route: "agent.chatStream",
          agentId: input.agentId,
          threadId,
          status: upstream.status,
          bodyPreview: body.slice(0, 200),
          ...byo
        });
        // Surface agent body (Memory / BYO / provider errors) instead of opaque 500.
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message:
            body.trim().length > 0
              ? `Hub agent error (${upstream.status}): ${body.slice(0, 400)}`
              : `Hub agent returned ${upstream.status} with an empty body`
        });
      }

      context.logger.set({
        event: "agent_hub_chat_stream_started",
        route: "agent.chatStream",
        agentId: input.agentId,
        threadId,
        messageCount: Array.isArray(input.messages) ? input.messages.length : null,
        ...byo
      });

      // Parse Mastra SSE → UIMessageChunk objects, then hand oRPC an
      // object stream. Do NOT pipe raw Uint8Array SSE frames — those
      // rehydrate as non-ArrayBuffer values and break TextDecoder on
      // the client.
      return streamToEventIterator(sseByteStreamToUIMessageChunkStream(upstream.body));
    }),

  /**
   * List suspended (paused) runs for the caller's hub thread only.
   * threadId / resourceId are derived from the session — never trusted from the client.
   */
  listSuspendedRuns: protectedProcedure
    .route({
      description: "List suspended runs on the caller's hub thread for HITL resume",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema.optional()
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

      const userId = context.session.user.id;
      const agentId = input.agentId ?? HUB_CHAT_AGENT_ID;
      if (!isChatAllowedAgentId(agentId)) {
        throw new ORPCError("BAD_REQUEST", { message: "Invalid agentId" });
      }
      const threadId = hubChatThreadId(userId);
      const resourceId = userId;

      // Built-in Mastra route (apiPrefix `/api`). Without it, Studio SPA returns HTML 200.
      const upstream = await context.agentWorker.fetch(
        `/api/agents/${encodeURIComponent(agentId)}/suspended-runs?threadId=${encodeURIComponent(threadId)}&resourceId=${encodeURIComponent(resourceId)}`
      );
      const bodyText = await upstream.text();
      if (!upstream.ok) {
        context.logger.set({
          event: "agent_hub_list_suspended_upstream_error",
          status: upstream.status,
          bodyPreview: bodyText.slice(0, 200)
        });
        // Soft-fail: empty approvals so hub still loads if agent is down/misrouted.
        if (upstream.status === 404 || upstream.status === 401 || upstream.status === 403) {
          return [];
        }
        throw new Error(`List suspended returned ${upstream.status}: ${bodyText.slice(0, 200)}`);
      }
      const data = parseAgentJsonBody(bodyText, "listSuspendedRuns");
      if (data === undefined) {
        context.logger.set({
          event: "agent_hub_list_suspended_non_json",
          bodyPreview: bodyText.slice(0, 200)
        });
        return [];
      }
      return (Array.isArray(data) ? data : []) as Array<{
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
   * Hydrate hub chat UI from Mastra Memory (session-scoped thread only).
   */
  listHubMessages: protectedProcedure
    .route({
      description: "List recent hub chat messages for the caller's memory thread",
      method: "POST"
    })
    .input(
      z.object({
        agentId: agentIdSchema.optional(),
        limit: z.number().int().min(1).max(80).optional().default(40)
      })
    )
    .output(
      z.object({
        messages: z.array(z.unknown()),
        uiMessages: z.array(z.unknown()).nullable()
      })
    )
    .handler(async ({ input, context }) => {
      if (!context.agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const userId = context.session.user.id;
      const agentId = input.agentId ?? HUB_CHAT_AGENT_ID;
      if (!isChatAllowedAgentId(agentId)) {
        throw new ORPCError("BAD_REQUEST", { message: "Invalid agentId" });
      }
      const threadId = hubChatThreadId(userId);
      const qs = new URLSearchParams({
        agentId,
        resourceId: userId,
        page: "0",
        perPage: String(input.limit ?? 40)
      });

      // Built-in Mastra route (apiPrefix `/api`). Path without `/api` hits Studio HTML.
      const upstream = await context.agentWorker.fetch(
        `/api/memory/threads/${encodeURIComponent(threadId)}/messages?${qs.toString()}`
      );
      const bodyText = await upstream.text();
      if (!upstream.ok) {
        // Empty / missing thread is fine — return empty history.
        if (upstream.status === 404 || upstream.status === 401 || upstream.status === 403) {
          return { messages: [], uiMessages: [] };
        }
        context.logger.set({
          event: "agent_hub_list_messages_upstream_error",
          status: upstream.status,
          bodyPreview: bodyText.slice(0, 200)
        });
        throw new Error(`List hub messages returned ${upstream.status}: ${bodyText.slice(0, 200)}`);
      }

      const parsed = parseAgentJsonBody(bodyText, "listHubMessages");
      if (parsed === undefined || typeof parsed !== "object" || parsed === null) {
        context.logger.set({
          event: "agent_hub_list_messages_non_json",
          bodyPreview: bodyText.slice(0, 200)
        });
        return { messages: [], uiMessages: [] };
      }
      const data = parsed as {
        messages?: unknown[];
        uiMessages?: unknown[] | null;
      };
      return {
        messages: Array.isArray(data.messages) ? data.messages : [],
        uiMessages: data.uiMessages ?? null
      };
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
      assertWorkflowRunOwner(input.runId, context.session.user.id);
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
        const llm = await resolveRuntimeAiCredentials(context.session.user.id, "stacks");
        const byo = llmLogFields(llm);
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
          llm
        };

        if (signal?.aborted) return;

        // 4. Stream workflow execution — cancels Mastra run on client abort
        const agentWorker = context.agentWorker;
        if (!agentWorker) {
          throw new ORPCError("INTERNAL_SERVER_ERROR", {
            message: "Agent worker is not configured. Set AGENT_WORKER_URL and restart the server."
          });
        }

        context.logger.set({
          event: "agent_detect_stacks_started",
          route: "agent.detectStacks",
          projectId: input.projectId || "draft",
          repoCount: input.repos.length,
          packageJsonCount: reposWithPackageJson.length,
          ...byo
        });

        try {
          yield* streamMastraWorkflow({
            agentWorker,
            workflowId: "detect-stacks-workflow",
            inputData: workflowInput,
            signal,
            parseStream: parseConcatenatedJsonStream,
            logger: context.logger,
            ownerUserId: userId
          });
          context.logger.set({
            event: "agent_detect_stacks_streamed",
            route: "agent.detectStacks",
            ...byo
          });
        } catch (error) {
          if (signal?.aborted) return;
          if (error instanceof DOMException && error.name === "AbortError") return;
          const detail = error instanceof Error ? error.message : String(error);
          context.logger.set({
            event: "agent_detect_stacks_upstream_error",
            route: "agent.detectStacks",
            ...byo
          });
          context.logger.error(error instanceof Error ? error : detail);
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
        context.logger.set({
          event: "agent_detect_stacks_failed",
          route: "agent.detectStacks"
        });
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
      const llm = await resolveRuntimeAiCredentials(userId, "stacks");
      const byo = llmLogFields(llm);
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
        llm
      };

      // 3. Stream workflow execution — cancels Mastra run on client abort
      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new Error("agentWorker not configured");
      }

      if (signal?.aborted) {
        return;
      }

      context.logger.set({
        event: "agent_organize_stacks_started",
        route: "agent.organizeStacks",
        stackCount: allStacks.length,
        ...byo
      });

      try {
        yield* streamMastraWorkflow({
          agentWorker,
          workflowId: "organize-stacks-workflow",
          inputData: workflowInput,
          signal,
          parseStream: parseConcatenatedJsonStream,
          logger: context.logger,
          ownerUserId: userId
        });
        context.logger.set({
          event: "agent_organize_stacks_streamed",
          route: "agent.organizeStacks",
          ...byo
        });
      } catch (error) {
        if (signal?.aborted) return;
        if (error instanceof DOMException && error.name === "AbortError") return;
        context.logger.set({
          event: "agent_organize_stacks_failed",
          route: "agent.organizeStacks",
          ...byo
        });
        context.logger.error(error instanceof Error ? error : String(error));
        throw error;
      }
    })
};
