import { RESERVED_PROFILE_PATH_SET } from "#@/profile/constants";
import { ProfileNameSchema } from "#@/profile/types";

export function normalizeProfileName(input: string): string {
  return input.trim().toLowerCase();
}

export function isReservedProfilePath(segment: string): boolean {
  return RESERVED_PROFILE_PATH_SET.has(segment.trim().toLowerCase());
}

export function parseProfileName(input: string) {
  return ProfileNameSchema.safeParse(normalizeProfileName(input));
}
