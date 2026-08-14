"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { UsernameSchema, type UsernameAvailabilityStatus } from "@tsu-stack/core";

const DEFAULT_DEBOUNCE_MS = 400;

export type UsernameAvailabilityResult = {
  /** Normalized value this result applies to. */
  username: string;
  isChecking: boolean;
  status: UsernameAvailabilityStatus | "error" | null;
  message?: string;
};

/**
 * Re-runs availability on every distinct username. TanStack Form onChangeAsync
 * only reliably settles the first debounce cycle (later edits skip isValidating
 * and can leave a stale "available" error map).
 */
export function useUsernameAvailability({
  value,
  currentUsername,
  enabled,
  debounceMs = DEFAULT_DEBOUNCE_MS
}: {
  value: string;
  currentUsername: string;
  enabled: boolean;
  debounceMs?: number;
}): UsernameAvailabilityResult {
  const parsed = UsernameSchema.safeParse(value);
  const normalized = parsed.success ? parsed.data : "";
  const isCurrent = parsed.success && normalized === currentUsername;
  const shouldCheck = enabled && parsed.success && !isCurrent && normalized.length > 0;

  const [debounced, setDebounced] = useState(normalized);

  useEffect(() => {
    const delay = shouldCheck ? debounceMs : 0;
    const timer = window.setTimeout(() => setDebounced(normalized), delay);
    return () => window.clearTimeout(timer);
  }, [normalized, shouldCheck, debounceMs]);

  const query = useQuery({
    ...orpcQueryClient.profile.checkUsername.queryOptions({
      input: { username: debounced }
    }),
    enabled: shouldCheck && debounced === normalized && debounced.length > 0,
    staleTime: 15_000,
    retry: false
  });

  if (!enabled || isCurrent) {
    return {
      username: normalized,
      isChecking: false,
      status: isCurrent ? "current" : null
    };
  }

  if (!parsed.success) {
    return {
      username: value,
      isChecking: false,
      status: "invalid",
      message: parsed.error.issues[0]?.message ?? "Invalid username"
    };
  }

  const waitingOnDebounce = debounced !== normalized;
  if (waitingOnDebounce || query.isPending || query.isFetching) {
    return { username: normalized, isChecking: true, status: null };
  }

  if (query.isError) {
    return {
      username: normalized,
      isChecking: false,
      status: "error",
      message: "Could not check username availability"
    };
  }

  if (!query.data) {
    return { username: normalized, isChecking: true, status: null };
  }

  return {
    username: query.data.username || normalized,
    isChecking: false,
    status: query.data.status,
    message: query.data.message
  };
}
