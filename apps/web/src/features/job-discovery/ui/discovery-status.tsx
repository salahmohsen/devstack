"use client";

import { discoveryRunLabel, discoveryBlockedReason } from "@tsu-stack/core";

import { useDiscoveryStatusQuery } from "@/features/job-discovery/api/discovery-status.query";

export function DiscoveryStatus() {
  const status = useDiscoveryStatusQuery();
  if (status.isError) {
    return (
      <p aria-live="polite" className="text-xs text-muted-foreground">
        Search status unavailable. Refresh to try again.
      </p>
    );
  }
  const data = status.data;
  if (!data) return null;
  const date = (value: string) => new Date(value).toLocaleString();
  return (
    <div className="space-y-1 text-xs text-muted-foreground" aria-live="polite">
      {data.run && (
        <p
          className={
            data.run.stage === "failed" && !discoveryBlockedReason(data.run.reason)
              ? "text-destructive"
              : undefined
          }
        >
          {discoveryRunLabel(data.run)}
          {data.run.reason ? `: ${discoveryBlockedReason(data.run.reason) ?? data.run.reason}` : ""}
          {data.run.stage === "retrying" && data.run.retryAt
            ? ` Next attempt: ${date(data.run.retryAt)}.`
            : ""}
        </p>
      )}
      {data.lastSuccessfulAt && <p>Last successful search: {date(data.lastSuccessfulAt)}</p>}
      {data.nextScheduledAt && <p>Next automatic search: {date(data.nextScheduledAt)}</p>}
      {data.run?.warnings.map((warning) => (
        <p key={warning}>{warning}</p>
      ))}
    </div>
  );
}
