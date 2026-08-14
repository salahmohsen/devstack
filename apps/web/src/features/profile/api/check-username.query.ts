import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type CheckUsernameInput, type CheckUsernameOutput } from "@tsu-stack/core";

/**
 * One-shot availability check (submit confirm). Live typing uses
 * `useUsernameAvailability`, which keys the query on the current value.
 */
export async function checkUsernameAvailability(
  username: CheckUsernameInput["username"],
  signal?: AbortSignal
): Promise<CheckUsernameOutput> {
  return orpcClient.profile.checkUsername({ username }, { signal });
}
