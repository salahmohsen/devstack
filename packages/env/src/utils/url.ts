import { z } from "zod";

const URL_WITH_SCHEME_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//;

export function normalizeUrlString(value: string) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return trimmedValue;
  }

  return URL_WITH_SCHEME_PATTERN.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
}

export const normalizedUrlSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return normalizeUrlString(value);
}, z.url());
