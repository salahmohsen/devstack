import { RESERVED_USERNAME_PATH_SET } from "#@/profile/constants";
import { UsernameSchema } from "#@/profile/types";

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

/** @deprecated Use normalizeUsername */
export const normalizeProfileName = normalizeUsername;

export function isReservedUsernamePath(segment: string): boolean {
  return RESERVED_USERNAME_PATH_SET.has(segment.trim().toLowerCase());
}

/** @deprecated Use isReservedUsernamePath */
export const isReservedProfilePath = isReservedUsernamePath;

export function parseUsername(input: string) {
  return UsernameSchema.safeParse(normalizeUsername(input));
}

/** @deprecated Use parseUsername */
export const parseProfileName = parseUsername;
