"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import { useQueryClient } from "@tanstack/react-query";
import * as React from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type UpsertSoftJobPreferencesOutput } from "@tsu-stack/core";

/**
 * Server soft upsert has no card. Invalidate Settings' jobPreference.get so
 * a later Save cannot replace the chat write with a stale 60s cache.
 */
export function UpsertSoftJobPreferencesToolUI({
  result
}: ToolCallMessagePartProps<Record<string, unknown>, UpsertSoftJobPreferencesOutput>) {
  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (result?.ok !== true) return;
    void queryClient.invalidateQueries({
      queryKey: orpcQueryClient.jobPreference.get.key()
    });
  }, [queryClient, result]);

  return null;
}
