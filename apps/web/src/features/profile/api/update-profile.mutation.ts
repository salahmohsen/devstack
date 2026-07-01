import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type ProfileUpdateInput } from "@tsu-stack/core/profile";

export function getUpdateProfileMutationOptions() {
  return orpcQueryClient.profile.update.mutationOptions();
}

export type { ProfileUpdateInput };
