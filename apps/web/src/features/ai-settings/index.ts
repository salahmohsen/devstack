export {
  aiSettingsQueryKeys,
  getAiSettingsQueryOptions,
  useGetAiSettingsQuery
} from "@/features/ai-settings/api/get-ai-settings.query";
export type { AiSettingsQueryResult } from "@/features/ai-settings/api/get-ai-settings.query";

export { useUpdateAiSettingsMutation } from "@/features/ai-settings/api/update-ai-settings.mutation";
export type {
  UpdateAiSettingsInput,
  UpdateAiSettingsMutationResult
} from "@/features/ai-settings/api/update-ai-settings.mutation";
