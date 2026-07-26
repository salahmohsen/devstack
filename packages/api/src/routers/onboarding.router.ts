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

import {
  requireResumeSourceObjectKey,
  ResumeSourceObjectKeyError
} from "#@/lib/onboarding/object-key";
import { extractTextFromPdf, PdfTextError } from "#@/lib/onboarding/pdf-text";
import { protectedProcedure } from "#@/lib/procedures/factory";

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
 * Parse raw concatenated JSON objects from an agent workflow stream and yield each event.
 * Same shape as `detectStacks` / `organizeStacks` in agent.router.ts.
 */
async function* streamWorkflowJsonEvents(
  body: ReadableStream<Uint8Array>
): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

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
    .handler(async function* ({ input, context, errors }) {
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

      let bytes: Uint8Array;
      try {
        bytes = await downloadObjectBytes(context.mediaBucket, fullKey);
      } catch (error) {
        if (error instanceof PdfTextError && error.code === "EXTRACT_FAILED") {
          throw errors.EXTRACT_FAILED({ message: error.message });
        }
        throw errors.EXTRACT_FAILED();
      }

      if (bytes.byteLength > RESUME_SOURCE_MAX_BYTES) {
        throw errors.FILE_TOO_LARGE();
      }

      if (!looksLikePdf(bytes)) {
        throw errors.UNSUPPORTED_MEDIA();
      }

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
        stackRepository.findAll()
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
        })
      };

      const agentWorker = context.agentWorker;
      if (!agentWorker) {
        throw new Error("agentWorker not configured");
      }

      const createRunRes = await agentWorker.fetch(
        `/api/workflows/resume-import-workflow/create-run`,
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

      const upstream = await agentWorker.fetch(
        `/api/workflows/resume-import-workflow/stream?runId=${encodeURIComponent(runId)}`,
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

      yield* streamWorkflowJsonEvents(upstream.body);
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
        throw errors.APPLY_FAILED();
      }

      await bestEffortDeleteResumeSource(context.mediaBucket, objectKey, userId);

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
