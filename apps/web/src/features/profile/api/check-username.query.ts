import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type CheckUsernameInput, type CheckUsernameOutput } from "@tsu-stack/core";

/**
 * One-shot availability check for TanStack Form async validators.
 * Pass the field validator `signal` so in-flight checks cancel on retype.
 */
export async function checkUsernameAvailability(
  username: CheckUsernameInput["username"],
  signal?: AbortSignal
): Promise<CheckUsernameOutput> {
  return orpcClient.profile.checkUsername({ username }, { signal });
}
