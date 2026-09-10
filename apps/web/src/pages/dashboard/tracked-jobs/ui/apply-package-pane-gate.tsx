"use client";

import { TriangleAlertIcon } from "lucide-react";
import { type ReactNode } from "react";

import { Alert, AlertAction, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

export const CHIP_PILL =
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap";

/** Scroll stage the paper panes share: muted canvas, pane-owned scroll, centered column. */
export function PaneStage({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-full min-h-0 justify-center overflow-y-auto bg-muted/40 p-4 lg:px-6 lg:py-6",
        className
      )}
    >
      {children}
    </div>
  );
}

export type CompactItemCardProps = {
  switchId: string;
  title: string;
  subtitle?: string;
  include: boolean;
  disabled?: boolean;
  onIncludeChange: (include: boolean) => void;
  children: ReactNode;
};

/** Below-lg editor card: title row + include switch, body fields as children. */
export function CompactItemCard({
  switchId,
  title,
  subtitle,
  include,
  disabled,
  onIncludeChange,
  children
}: CompactItemCardProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl border p-3.5",
        include ? "border-border bg-background" : "border-border/50 bg-muted/20 opacity-70"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{title}</p>
          {subtitle != null ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span id={`${switchId}-label`}>Include</span>
          <Switch
            id={switchId}
            checked={include}
            disabled={disabled}
            aria-label={`Include ${title} on the resume`}
            aria-labelledby={`${switchId}-label`}
            onCheckedChange={onIncludeChange}
          />
        </div>
      </div>
      {children}
    </div>
  );
}

export type PaneQueryGateProps = {
  queries: ReadonlyArray<{
    isPending: boolean;
    isError: boolean;
    refetch: () => unknown;
  }>;
  /** One-line failure copy shown with the retry action. */
  errorTitle: string;
  children: ReactNode;
};

/**
 * Shared data gate for apply-package panes: quiet pending row while profile
 * queries load, Alert+Retry on failure, children once data is safe to render.
 * Pending when any query is pending, errored when any query errored; retry
 * refetches every query.
 */
export function PaneQueryGate({ queries, errorTitle, children }: PaneQueryGateProps) {
  if (queries.some((query) => query.isPending)) {
    return (
      <div className="grid min-h-40 place-items-center">
        <output className="text-sm text-muted-foreground">Loading…</output>
      </div>
    );
  }
  if (queries.some((query) => query.isError)) {
    return (
      <Alert variant="error">
        <TriangleAlertIcon />
        <AlertTitle className="min-w-0">{errorTitle}</AlertTitle>
        <AlertAction>
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={() => {
              for (const query of queries) void query.refetch();
            }}
          >
            Retry
          </Button>
        </AlertAction>
      </Alert>
    );
  }
  return <>{children}</>;
}
