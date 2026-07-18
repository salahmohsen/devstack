import { streamToEventIterator } from "@orpc/server";
import { z } from "zod";

import { DetectStacksClientInputSchema, type OrpcContext } from "@tsu-stack/core";
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

import { ownerProcedure, publicProcedure } from "#@/lib/procedures/factory";

// Parse GitHub URL to owner/repo format
function parseGitHubRepo(url: string): string {
  const match = url.match(/github\.com\/([^/]+\/[^/]+?)(?:\/|$)/);
  return match ? match[1] : url;
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
  chat: publicProcedure
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

      const response = await context.agentWorker.fetch(`/agents/${input.agentId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: input.messages })
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
   * agent's Mastra config). Returns AI SDK UIMessageStream SSE
   * events and pipes the response body through oRPC's EventIterator
   * protocol using `streamToEventIterator`. The client's
   * `eventIteratorToUnproxiedDataStream` converts it back to a
   * `ReadableStream<UIMessageChunk>` that `useChat` consumes.
   *
   * NOTE: Mastra's built-in `/agents/:agentId/stream/ui` is
   * deprecated in v1.50.1 — use this path instead.
   */
  chatStream: publicProcedure
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

      const upstream = await context.agentWorker.fetch(`/chat/${input.agentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: input.messages })
      });

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        throw new Error(`Agent stream returned ${upstream.status}: ${body}`);
      }

      // streamToEventIterator takes a ReadableStream<Uint8Array> and
      // returns an AsyncIteratorClass — oRPC's EventIterator shape.
      return streamToEventIterator(upstream.body);
    }),

  /**
   * Detect stacks from project repos via Mastra workflow.
   * Streams workflow events for progress tracking.
   */
  detectStacks: ownerProcedure
    .route({
      description: "Detect stacks from project repos via Mastra workflow",
      method: "POST"
    })
    .input(DetectStacksClientInputSchema)
    .handler(async function* ({ input, context }) {
      // 1. Pre-fetch package.json from each repo
      const repoPackages = await Promise.all(
        input.repos.map(async (repoUrl: string) => {
          const repoSlug = parseGitHubRepo(repoUrl);

          // Detect default branch (private first, then public)
          const defaultBranch = await getDefaultBranch(repoSlug, context);

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
      );

      // 2. Look up existing stacks, dependencies, and last scan
      const existingStacks = await stackRepository.findAll();

      const existingDependencies = await stackDependencyRepository.findAll();

      const lastScan = await projectStackScanRepository.findLatestByProjectId(input.projectId);

      // 3. Build DetectStacksWorkflowInputSchema payload
      const workflowInput = {
        projectId: input.projectId,
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
          : null
      };

      // 4. Stream workflow execution
      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new Error("agentWorker not configured");
      }

      // Create a run first, then stream events with the runId
      const createRunRes = await agentWorker.fetch(
        `/api/workflows/detect-stacks-workflow/create-run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );

      if (!createRunRes.ok) {
        const body = await createRunRes.text();
        throw new Error(`Workflow create-run returned ${createRunRes.status}: ${body}`);
      }

      const { runId } = (await createRunRes.json()) as { runId: string };

      // Start streaming — this keeps the connection open while the workflow runs
      const upstream = await agentWorker.fetch(
        `/api/workflows/detect-stacks-workflow/stream?runId=${encodeURIComponent(runId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputData: workflowInput })
        }
      );

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        throw new Error(`Workflow stream returned ${upstream.status}: ${body}`);
      }

      // Parse raw JSON event stream from agent worker and yield each event.
      // The workflow stream sends raw concatenated JSON objects (NOT SSE).
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Events are raw concatenated JSON — find complete objects
          let depth = 0;
          let start = -1;
          for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === "{") {
              if (depth === 0) start = i;
              depth++;
            } else if (buffer[i] === "}") {
              depth--;
              if (depth === 0 && start >= 0) {
                try {
                  const event = JSON.parse(buffer.slice(start, i + 1));
                  yield event;
                } catch {
                  // Ignore malformed JSON
                }
                start = -1;
              }
            }
          }

          if (start >= 0) {
            buffer = buffer.slice(start);
          } else {
            buffer = "";
          }
        }

        // Flush remaining buffer — may contain a final event
        if (buffer.trim().length > 0) {
          try {
            const event = JSON.parse(buffer);
            yield event;
          } catch {
            // Ignore malformed trailing data
          }
        }
      } finally {
        reader.releaseLock();
      }
    }),

  /**
   * Organize stacks — merge duplicates, rename, enrich metadata.
   * Streams workflow events for progress tracking.
   */
  organizeStacks: ownerProcedure
    .route({
      description: "Organize stacks — merge duplicates, rename, enrich metadata",
      method: "POST"
    })
    .input(z.object({}))
    .handler(async function* ({ context }) {
      // 1. Fetch all existing stacks
      const allStacks = await stackRepository.findAll();

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
        })
      };

      // 3. Stream workflow execution
      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new Error("agentWorker not configured");
      }

      // Create a run first, then stream events with the runId
      const createRunRes = await agentWorker.fetch(
        `/api/workflows/organize-stacks-workflow/create-run`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        }
      );

      if (!createRunRes.ok) {
        const body = await createRunRes.text();
        throw new Error(`Workflow create-run returned ${createRunRes.status}: ${body}`);
      }

      const { runId } = (await createRunRes.json()) as { runId: string };

      // Start streaming — this keeps the connection open while the workflow runs
      const upstream = await agentWorker.fetch(
        `/api/workflows/organize-stacks-workflow/stream?runId=${encodeURIComponent(runId)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inputData: workflowInput })
        }
      );

      if (!upstream.ok || !upstream.body) {
        const body = await upstream.text();
        throw new Error(`Workflow stream returned ${upstream.status}: ${body}`);
      }

      // Parse raw JSON event stream from agent worker and yield each event.
      const reader = upstream.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventCount = 0;
      let completed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Events are raw concatenated JSON — find complete objects
          let depth = 0;
          let start = -1;
          for (let i = 0; i < buffer.length; i++) {
            if (buffer[i] === "{") {
              if (depth === 0) start = i;
              depth++;
            } else if (buffer[i] === "}") {
              depth--;
              if (depth === 0 && start >= 0) {
                try {
                  const event = JSON.parse(buffer.slice(start, i + 1));
                  eventCount++;
                  yield event;
                } catch {
                  // Ignore malformed JSON
                }
                start = -1;
              }
            }
          }

          if (start >= 0) {
            buffer = buffer.slice(start);
          } else {
            buffer = "";
          }
        }

        // Flush remaining buffer — may contain a final event
        if (buffer.trim().length > 0) {
          try {
            const event = JSON.parse(buffer);
            eventCount++;
            yield event;
          } catch {
            // Ignore malformed trailing data
          }
        }

        completed = true;
      } finally {
        reader.releaseLock();

        // Cancel the workflow if the client disconnected before completion
        if (!completed) {
          try {
            await agentWorker.fetch(`/api/workflows/organize-stacks-workflow/cancel/${runId}`, {
              method: "POST"
            });
          } catch {
            // Best-effort cancel — workflow may have already finished
          }
        }
      }
    })
};
