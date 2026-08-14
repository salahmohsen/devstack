import { type ReactNode } from "react";

import { Card } from "@tsu-stack/ui/components/card";
import { cn } from "@tsu-stack/ui/lib/utils";

export function IntegrationBrandMark({ children }: { children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg bg-background",
        "shadow-[0_0_0_1px_oklch(0_0_0/0.1)] dark:shadow-[0_0_0_1px_oklch(1_0_0/0.1)]"
      )}
    >
      {children}
    </div>
  );
}

export function IntegrationMeta({
  rows
}: {
  rows: Array<{ label: string; value: string; tone?: "default" | "warning" } | null | undefined>;
}) {
  const visible = rows.filter(
    (row): row is { label: string; value: string; tone?: "default" | "warning" } =>
      Boolean(row?.value.trim())
  );
  if (visible.length === 0) return null;

  return (
    <dl className="space-y-1">
      {visible.map((row) => (
        <div key={row.label} className="flex min-w-0 items-baseline gap-1.5 text-xs">
          <dt className="shrink-0 text-muted-foreground">{row.label}</dt>
          <span className="shrink-0 text-muted-foreground/70" aria-hidden>
            ·
          </span>
          <dd
            className={cn(
              "min-w-0 truncate",
              row.tone === "warning" ? "text-warning-foreground" : "text-foreground"
            )}
            title={row.value}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

export function IntegrationCard({
  title,
  logo,
  badge,
  description,
  meta,
  extra,
  toggle,
  actions
}: {
  title: string;
  logo: ReactNode;
  badge: ReactNode;
  description: string;
  meta?: ReactNode;
  extra?: ReactNode;
  toggle?: ReactNode;
  actions: ReactNode;
}) {
  return (
    <Card className="flex h-full min-h-0 flex-col gap-0 overflow-hidden p-0">
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-start justify-between gap-3">
          {logo}
          {badge}
        </div>
        <div className="space-y-1.5">
          <h3 className="text-base font-semibold tracking-tight text-pretty">{title}</h3>
          <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{description}</p>
        </div>
        {meta}
        {extra}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
        <div className="flex min-h-7 min-w-10 items-center">{toggle}</div>
        <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div>
      </div>
    </Card>
  );
}
