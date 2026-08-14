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

export { useRotateMailWebhookMutation } from "@/features/mail-settings/api/rotate-mail-webhook.mutation";
export type { RotateMailWebhookMutationResult } from "@/features/mail-settings/api/rotate-mail-webhook.mutation";

export { ResendIntegration } from "@/features/mail-settings/ui/resend-integration";
