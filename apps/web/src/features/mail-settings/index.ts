export {
  getMailSettingsQueryOptions,
  mailSettingsQueryKeys,
  useGetMailSettingsQuery
} from "@/features/mail-settings/api/get-mail-settings.query";
export type { MailSettingsQueryResult } from "@/features/mail-settings/api/get-mail-settings.query";

export { useUpdateMailSettingsMutation } from "@/features/mail-settings/api/update-mail-settings.mutation";
export type {
  UpdateMailSettingsInput,
  UpdateMailSettingsMutationResult
} from "@/features/mail-settings/api/update-mail-settings.mutation";
