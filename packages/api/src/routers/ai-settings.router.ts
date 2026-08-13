import { randomUUID } from "node:crypto";

import {
  AiSettingsOutputSchema,
  defaultAiModels,
  defaultAiSettingsOutput,
  ListProviderModelsInputSchema,
  ListProviderModelsOutputSchema,
  maskApiKeyLast4,
  mergeAiModels,
  stripDeadModelProviderIds,
  TestAiProviderInputSchema,
  TestAiProviderOutputSchema,
  UpdateAiSettingsInputSchema,
  type AiModelProviderIdsMap,
  type AiModelsMap,
  type AiProviderKind,
  type AiProviderPublic
} from "@tsu-stack/core";
import { userAiSettingsRepository } from "@tsu-stack/db";
import {
  type StoredAiModelProviderIds,
  type StoredAiModels,
  type StoredAiProvider
} from "@tsu-stack/db/schema";

import { protectedProcedure } from "#@/lib/procedures/factory";
import { listProviderModels } from "#@/lib/settings/list-provider-models";
import { sealSecret } from "#@/lib/settings/seal-secret";
import { testAiProviderConnection } from "#@/lib/settings/test-ai-provider";

function toPublicProviders(providers: StoredAiProvider[]): AiProviderPublic[] {
  return providers.map((p) => {
    return {
      id: p.id,
      // Stored as string; validated on write via AiProviderKindSchema
      kind: p.kind as AiProviderKind,
      label: p.label,
      hasApiKey: Boolean(p.apiKeyCiphertext),
      apiKeyLast4: p.apiKeyLast4
    };
  });
}

function toOutput(
  row: NonNullable<Awaited<ReturnType<typeof userAiSettingsRepository.findByUserId>>>
) {
  // Merge defaults so existing users missing new feature keys still pass Zod.
  const models = { ...defaultAiModels(), ...row.models };
  return AiSettingsOutputSchema.parse({
    providers: toPublicProviders(row.providers),
    models,
    modelProviderIds: row.modelProviderIds ?? {},
    updatedAt: row.updatedAt
  });
}

export const aiSettingsRouter = {
  get: protectedProcedure
    .route({
      description: "Get AI settings for the current user (keys masked)",
      method: "GET"
    })
    .output(AiSettingsOutputSchema)
    .handler(async ({ context }) => {
      const row = await userAiSettingsRepository.findByUserId(context.session.user.id);
      if (!row) return defaultAiSettingsOutput();
      return toOutput(row);
    }),

  update: protectedProcedure
    .route({
      description: "Update AI providers and models",
      method: "POST"
    })
    .input(UpdateAiSettingsInputSchema)
    .output(AiSettingsOutputSchema)
    .errors({
      PROVIDER_KEY_REQUIRED: {
        message: "Each new provider needs an API key.",
        status: 400
      }
    })
    .handler(async ({ input, context, errors }) => {
      const userId = context.session.user.id;
      const existing = await userAiSettingsRepository.findByUserId(userId);
      const baseModels: AiModelsMap = {
        ...defaultAiModels(),
        ...existing?.models
      };
      const models = mergeAiModels(baseModels, input.models) as StoredAiModels;

      let providers: StoredAiProvider[] = existing?.providers ?? [];

      if (input.providers) {
        const prevById = new Map(providers.map((p) => [p.id, p]));
        const next: StoredAiProvider[] = [];

        for (const p of input.providers) {
          const id = p.id ?? randomUUID();
          const prev = prevById.get(id);
          const apiKey = p.apiKey?.trim();

          if (apiKey) {
            next.push({
              id,
              kind: p.kind,
              label: p.label,
              apiKeyLast4: maskApiKeyLast4(apiKey),
              apiKeyCiphertext: sealSecret(apiKey)
            });
          } else if (prev) {
            next.push({
              id,
              kind: p.kind,
              label: p.label,
              apiKeyLast4: prev.apiKeyLast4,
              apiKeyCiphertext: prev.apiKeyCiphertext
            });
          } else {
            throw errors.PROVIDER_KEY_REQUIRED();
          }
        }

        if (input.replaceProviders === false) {
          const merged = new Map(providers.map((p) => [p.id, p]));
          for (const p of next) merged.set(p.id, p);
          providers = [...merged.values()];
        } else {
          providers = next;
        }
      }

      const rawBindings: AiModelProviderIdsMap =
        input.modelProviderIds ?? ((existing?.modelProviderIds ?? {}) as AiModelProviderIdsMap);

      const modelProviderIds = stripDeadModelProviderIds(
        rawBindings,
        new Set(providers.map((p) => p.id))
      ) as StoredAiModelProviderIds;

      const row = await userAiSettingsRepository.upsert({
        id: existing?.id ?? randomUUID(),
        userId,
        providers,
        models,
        modelProviderIds
      });

      return toOutput(row);
    }),

  listProviderModels: protectedProcedure
    .route({
      description:
        "List live or catalog models for a provider kind (draft or sealed key; POST so keys stay out of URLs)",
      method: "POST"
    })
    .input(ListProviderModelsInputSchema)
    .output(ListProviderModelsOutputSchema)
    .handler(async ({ input, context }) =>
      listProviderModels({
        userId: context.session.user.id,
        input
      })
    ),

  testProvider: protectedProcedure
    .route({
      description: "Probe a provider API key with a cheap BYO generate call for a model",
      method: "POST"
    })
    .input(TestAiProviderInputSchema)
    .output(TestAiProviderOutputSchema)
    .handler(async ({ input, context }) =>
      testAiProviderConnection({
        userId: context.session.user.id,
        agentWorker: context.agentWorker,
        input
      })
    )
};
