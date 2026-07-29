export {
  getNotificationSettingsQueryOptions,
  notificationSettingsQueryKeys,
  useGetNotificationSettingsQuery
} from "@/features/notification-settings/api/get-notification-settings.query";
export type { NotificationSettingsQueryResult } from "@/features/notification-settings/api/get-notification-settings.query";

export { useUpdateNotificationSettingsMutation } from "@/features/notification-settings/api/update-notification-settings.mutation";
export type {
  UpdateNotificationSettingsInput,
  UpdateNotificationSettingsMutationResult
} from "@/features/notification-settings/api/update-notification-settings.mutation";
