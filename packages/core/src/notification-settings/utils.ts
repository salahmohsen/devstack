import { defaultNotificationChannelPrefs } from "./constants";
import { type NotificationChannelPrefs, type NotificationSettingsOutput } from "./types";

export function defaultNotificationSettingsOutput(
  accountEmail: string
): NotificationSettingsOutput {
  return {
    notificationEmail: accountEmail,
    accountEmail,
    channels: defaultNotificationChannelPrefs(),
    emailDeliveryMode: "immediate",
    updatedAt: null
  };
}

export function mergeNotificationChannels(
  current: NotificationChannelPrefs,
  patch: Partial<NotificationChannelPrefs> | undefined
): NotificationChannelPrefs {
  if (!patch) return current;
  const next = { ...current };
  for (const key of Object.keys(patch) as (keyof NotificationChannelPrefs)[]) {
    const value = patch[key];
    if (value) {
      next[key] = { ...current[key], ...value };
    }
  }
  return next;
}
