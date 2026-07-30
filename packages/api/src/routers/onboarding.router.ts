import { ORPCError } from "@orpc/server";
import { z } from "zod";

import {
  OnboardingApplyInputSchema,
  OnboardingDiscardSourceInputSchema,
  OnboardingSkipInputSchema,
  OnboardingStatusOutputSchema,
  RESUME_SOURCE_MAX_BYTES,
  ResumeImportExtractClientInputSchema,
  type OrpcContext
} from "@tsu-stack/core";
import {
  applyOnboardingDraft,
  OnboardingApplyError,
  stackRepository,
  userRepository
} from "@tsu-stack/db/repositories";

import { streamMastraWorkflow } from "#@/lib/agent/workflow-stream";
import {
  requireResumeSourceObjectKey,
  ResumeSourceObjectKeyError
} from "#@/lib/onboarding/object-key";
import { extractTextFromPdf, PdfTextError } from "#@/lib/onboarding/pdf-text";
import { promoteResumeSourceToDefault } from "#@/lib/onboarding/promote-resume-source";
import { protectedProcedure } from "#@/lib/procedures/factory";
import { resolveRuntimeAiCredentials } from "#@/lib/settings/resolve-runtime-ai";

const OnboardingApplyOutputSchema = z.object({
  experiencesCreated: z.number().int(),
  projectsCreated: z.number().int(),
  stacksUpserted: z.number().int()
});

const SuccessOutputSchema = z.object({
  success: z.boolean()
});

/** PDF magic: `%PDF` */
function looksLikePdf(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 4 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46
  );
}

async function downloadObjectBytes(
  mediaBucket: OrpcContext["mediaBucket"],
  fullKey: string
): Promise<Uint8Array> {
  const object = await mediaBucket.get(fullKey);
  if (!object?.body) {
    throw new PdfTextError("EXTRACT_FAILED", "Resume source object not found");
  }
  return new Uint8Array(await new Response(object.body).arrayBuffer());
}

/**
 * Best-effort delete of a session resume-source object.
 * Invalid keys and storage failures are swallowed (post-commit / skip cleanup).
 */
async function bestEffortDeleteResumeSource(
  mediaBucket: OrpcContext["mediaBucket"],
  objectKey: string | undefined,
  userId: string
): Promise<void> {
  if (!objectKey) return;
  try {
    const fullKey = requireResumeSourceObjectKey(objectKey, userId);
    await mediaBucket.delete(fullKey);
  } catch {
    // best-effort only
  }
}

/**
 * Parse Mastra workflow streams of concatenated JSON objects (NOT SSE).
 * String-aware so braces inside messages do not split events.
 * Kept in sync with `parseConcatenatedJsonStream` in agent.router.ts.
 */
async function* streamWorkflowJsonEvents(
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
  } finally {
    reader.releaseLock();
  }
}

export const onboardingRouter = {
  status: protectedProcedure
    .route({
      description: "Get the current user's onboarding completion status",
      method: "GET"
    })
    .output(OnboardingStatusOutputSchema)
    .handler(async ({ context }) => {
      const row = await userRepository.findById(context.session.user.id);
      return { onboardingCompletedAt: row?.onboardingCompletedAt ?? null };
    }),

  /**
   * Download resume PDF → extract text → stream `resume-import-workflow` events.
   * Do not log resume text (PII).
   */
  extract: protectedProcedure
    .route({
      description: "Extract a resume import draft from an uploaded PDF (streaming workflow)",
      method: "POST"
    })
    .input(ResumeImportExtractClientInputSchema)
    .errors({
      INVALID_OBJECT_KEY: {
        message: "Invalid resume source object key",
        status: 400
      },
      UNSUPPORTED_MEDIA: {
        message: "Only PDF resume sources are supported",
        status: 415
      },
      FILE_TOO_LARGE: {
        message: "Resume source exceeds maximum size",
        status: 413
      },
      EXTRACT_FAILED: {
        message: "Failed to extract text from resume",
        status: 422
      }
    })
    .handler(async function* ({ input, context, errors, signal }) {
      const userId = context.session.user.id;

      if (signal?.aborted) return;

      /** Synthetic step events so the client can progress before the agent stream opens. */
      const emitStep = (stepName: string) => {
        return {
          type: "workflow-step-start" as const,
          payload: { stepName, id: stepName, status: "running" as const }
        };
      };

      let fullKey: string;
      try {
        fullKey = requireResumeSourceObjectKey(input.objectKey, userId);
      } catch (error) {
        if (error instanceof ResumeSourceObjectKeyError) {
          throw errors.INVALID_OBJECT_KEY({ message: error.message });
        }
        throw error;
      }

      yield emitStep("download");

      let bytes: Uint8Array;
      try {
        bytes = await downloadObjectBytes(context.mediaBucket, fullKey);
      } catch (error) {
        if (error instanceof PdfTextError && error.code === "EXTRACT_FAILED") {
          throw errors.EXTRACT_FAILED({ message: error.message });
        }
        throw errors.EXTRACT_FAILED({
          message:
            error instanceof Error
              ? error.message
              : "Resume source object not found or could not be downloaded"
        });
      }

      if (bytes.byteLength > RESUME_SOURCE_MAX_BYTES) {
        throw errors.FILE_TOO_LARGE();
      }

      if (!looksLikePdf(bytes)) {
        throw errors.UNSUPPORTED_MEDIA();
      }

      yield emitStep("pdf-text");

      let resumeText: string;
      try {
        resumeText = await extractTextFromPdf(bytes);
      } catch (error) {
        if (error instanceof PdfTextError) {
          if (error.code === "FILE_TOO_LARGE") {
            throw errors.FILE_TOO_LARGE({ message: error.message });
          }
          throw errors.EXTRACT_FAILED({ message: error.message });
        }
        throw errors.EXTRACT_FAILED();
      }

      // Prefetch profile + stacks for workflow input (no resume text logging).
      const [userRow, existingStacks] = await Promise.all([
        userRepository.findById(userId),
        stackRepository.findAllByUserId(userId)
      ]);
      if (!userRow) {
        throw new Error("Session references a user that no longer exists");
      }

      const workflowInput = {
        resumeText,
        sourceFilename: input.filename,
        existingProfile: {
          name: userRow.name,
          email: userRow.email,
          summary: userRow.summary ?? null
        },
        existingStacks: existingStacks.map((stack) => {
          return {
            id: stack.id,
            name: stack.name
          };
        }),
        llm: await resolveRuntimeAiCredentials(userId, "resumeImport")
      };

      if (signal?.aborted) return;

      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Agent worker is not configured. Set AGENT_WORKER_URL and restart the server."
        });
      }

      yield emitStep("extract");

      // Stream resume-import workflow — cancels Mastra run on client abort
      try {
        yield* streamMastraWorkflow({
          agentWorker,
          workflowId: "resume-import-workflow",
          inputData: workflowInput,
          signal,
          parseStream: streamWorkflowJsonEvents,
          logger: context.logger
        });
      } catch (error) {
        if (signal?.aborted) return;
        const detail = error instanceof Error ? error.message : String(error);
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: `Cannot reach agent worker: ${detail}`
        });
      }
    }),

  apply: protectedProcedure
    .route({
      description: "Apply a reviewed resume-import draft and mark onboarding complete",
      method: "POST"
    })
    .input(OnboardingApplyInputSchema)
    .output(OnboardingApplyOutputSchema)
    .errors({
      EMPTY_DRAFT: {
        message: "Nothing to apply: no selected items and profile is unchanged",
        status: 400
      },
      EMAIL_TAKEN: {
        message: "That email is already in use.",
        status: 409
      },
      APPLY_VALIDATION: {
        message: "Draft failed validation",
        status: 400
      },
      APPLY_FAILED: {
        message: "Failed to apply onboarding draft",
        status: 500
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const { objectKey, ...draft } = input;

      let result: z.infer<typeof OnboardingApplyOutputSchema>;
      try {
        result = await applyOnboardingDraft(userId, draft);
      } catch (error) {
        if (error instanceof OnboardingApplyError) {
          if (error.code === "EMPTY_DRAFT") {
            throw errors.EMPTY_DRAFT({ message: error.message });
          }
          if (error.code === "EMAIL_TAKEN") {
            throw errors.EMAIL_TAKEN({ message: error.message });
          }
        }
        const detail = error instanceof Error ? error.message : String(error);
        throw errors.APPLY_FAILED({
          message: `Failed to apply onboarding draft: ${detail}`
        });
      }

      // Store the uploaded PDF as the default resume (permanent inventory).
      // Draft apply already succeeded — promote is best-effort so a storage
      // failure does not undo onboarding completion. On failure, leave the
      // session source in place rather than deleting the only remaining copy.
      if (objectKey) {
        try {
          await promoteResumeSourceToDefault({
            mediaBucket: context.mediaBucket,
            userId,
            objectKey,
            filename: draft.meta?.sourceFilename
          });
        } catch {
          // Intentionally no-op: profile data is committed; PDF may remain under resume-sources/.
        }
      }

      return result;
    }),

  skip: protectedProcedure
    .route({
      description: "Skip onboarding and mark it complete",
      method: "POST"
    })
    .input(OnboardingSkipInputSchema)
    .output(OnboardingStatusOutputSchema)
    .handler(async ({ input, context }) => {
      const userId = context.session.user.id;
      const updated = await userRepository.setOnboardingCompletedAt(userId, new Date());
      if (!updated) {
        throw new Error("Session references a user that no longer exists");
      }

      await bestEffortDeleteResumeSource(context.mediaBucket, input.objectKey, userId);

      return { onboardingCompletedAt: updated.onboardingCompletedAt ?? null };
    }),

  discardSource: protectedProcedure
    .route({
      description: "Delete a session resume-source PDF without completing onboarding",
      method: "POST"
    })
    .input(OnboardingDiscardSourceInputSchema)
    .output(SuccessOutputSchema)
    .errors({
      INVALID_OBJECT_KEY: {
        message: "Invalid resume source object key",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;

      let fullKey: string;
      try {
        fullKey = requireResumeSourceObjectKey(input.objectKey, userId);
      } catch (error) {
        if (error instanceof ResumeSourceObjectKeyError) {
          throw errors.INVALID_OBJECT_KEY({ message: error.message });
        }
        throw error;
      }

      await context.mediaBucket.delete(fullKey);
      return { success: true };
    })
};
