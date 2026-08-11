import { RESERVED_USERNAME_PATH_SET } from "#@/profile/constants";
import { UsernameSchema } from "#@/profile/types";

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export function isReservedUsernamePath(segment: string): boolean {
  return RESERVED_USERNAME_PATH_SET.has(segment.trim().toLowerCase());
}

export function parseUsername(input: string) {
  return UsernameSchema.safeParse(normalizeUsername(input));
}
