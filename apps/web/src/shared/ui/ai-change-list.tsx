"use client";

/**
 * Domain-agnostic AI change review UI.
 *
 * UX borrowed from Neon BranchDiff (downloaded to /tmp/neon-branch-diff for reference):
 * - header with from → to + kind counts
 * - search + kind filter
 * - expandable rows with before / after panels
 * - kind carried by symbol + label, not color alone
 *
 * Not a drop-in of BranchDiff (Neon schema/row domain + Neon tokens). Use this for
 * any AI-proposed catalog change (organize stacks, resume import, apply package, …).
 */

import { ArrowRightIcon, ChevronDownIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

import { Input } from "@tsu-stack/ui/components/input";
import { cn } from "@tsu-stack/ui/lib/utils";

export type AiChangeKind = "added" | "modified" | "removed";

export type AiChangeItem = {
  id: string;
  kind: AiChangeKind;
  /** Primary label (e.g. stack name). */
  title: string;
  /** One-line change summary under the title. */
  summary?: string;
  /** Why the model / heuristic proposed this. */
  reason?: string;
  before?: string | null;
  after?: string | null;
  /** Optional leading media (icon, avatar). */
  leading?: ReactNode;
  /** Extra chip / badge row next to title. */
  badges?: ReactNode;
  /** Free-form expanded body (replaces default before/after when set). */
  details?: ReactNode;
  /** Optional selection checkbox slot (rendered left of the row). */
  selectControl?: ReactNode;
  /** Extra searchable text. */
  searchText?: string;
};

export type AiChangeKindMeta = {
  symbol: string;
  label: string;
  className: string;
  surface: string;
};

export const DEFAULT_AI_CHANGE_KINDS: Record<AiChangeKind, AiChangeKindMeta> = {
  added: {
    symbol: "+",
    label: "Added",
    className: "text-emerald-600 dark:text-emerald-400",
    surface: "bg-emerald-500/10"
  },
  modified: {
    symbol: "~",
    label: "Modified",
    className: "text-amber-600 dark:text-amber-400",
    surface: "bg-amber-500/10"
  },
  removed: {
    symbol: "−",
    label: "Removed",
    className: "text-destructive",
    surface: "bg-destructive/8"
  }
};

type KindFilter = "all" | AiChangeKind;

function countKinds(items: AiChangeItem[]) {
  const counts: Record<AiChangeKind, number> = { added: 0, modified: 0, removed: 0 };
  for (const item of items) counts[item.kind] += 1;
  return counts;
}

function matchesSearch(item: AiChangeItem, query: string): boolean {
  if (!query) return true;
  const hay = [
    item.title,
    item.summary,
    item.reason,
    item.before,
    item.after,
    item.searchText,
    item.kind
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return hay.includes(query.toLowerCase());
}

export function AiChangeCount({
  count,
  kind,
  kindMeta = DEFAULT_AI_CHANGE_KINDS
}: {
  count: number;
  kind: AiChangeKind;
  kindMeta?: Record<AiChangeKind, AiChangeKindMeta>;
}) {
  const meta = kindMeta[kind];
  return (
    <span className={cn("inline-flex items-center gap-1 tabular-nums", meta.className)}>
      <span aria-hidden className="font-mono font-semibold">
        {meta.symbol}
      </span>
      {count}
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

function displayOrDash(value?: string | null): string {
  const trimmed = value?.trim();
  if (!trimmed) return "—";
  return trimmed;
}

export function AiChangeBeforeAfter({
  before,
  after
}: {
  before?: string | null;
  after?: string | null;
}) {
  if (!before && !after) return null;
  return (
    <div className="grid gap-1.5 text-[11px] sm:grid-cols-2">
      <div className="min-w-0 rounded-sm bg-destructive/5 px-2 py-1.5 text-muted-foreground">
        <span className="mb-0.5 block font-medium text-destructive/80">Before</span>
        <span className="wrap-break-word">{displayOrDash(before)}</span>
      </div>
      <div className="min-w-0 rounded-sm bg-emerald-500/5 px-2 py-1.5 text-muted-foreground">
        <span className="mb-0.5 block font-medium text-emerald-600 dark:text-emerald-400">
          After
        </span>
        <span className="wrap-break-word">{displayOrDash(after)}</span>
      </div>
    </div>
  );
}

function KindFilterBar({
  value,
  onChange,
  counts,
  kindMeta,
  kinds
}: {
  value: KindFilter;
  onChange: (v: KindFilter) => void;
  counts: Record<AiChangeKind, number>;
  kindMeta: Record<AiChangeKind, AiChangeKindMeta>;
  kinds: AiChangeKind[];
}) {
  const options: Array<{ id: KindFilter; label: string }> = [
    { id: "all", label: "All" },
    ...kinds.map((k) => {
      return { id: k as KindFilter, label: kindMeta[k].label };
    })
  ];
  return (
    <fieldset className="flex shrink-0 items-center self-start rounded-md border border-input p-0.5 sm:self-auto">
      <legend className="sr-only">Filter changes</legend>
      {options.map((opt) => {
        const count =
          opt.id === "all"
            ? kinds.reduce((sum, k) => sum + counts[k], 0)
            : counts[opt.id as AiChangeKind];
        const disabled = opt.id !== "all" && count === 0;
        return (
          <button
            key={opt.id}
            type="button"
            disabled={disabled}
            aria-pressed={value === opt.id}
            className={cn(
              "h-7 rounded-sm px-2 text-[11px] font-medium text-muted-foreground capitalize transition-colors",
              "hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none",
              "disabled:opacity-40 aria-pressed:bg-muted aria-pressed:text-foreground"
            )}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
            {opt.id !== "all" ? (
              <span className="ml-1 text-muted-foreground/80 tabular-nums">{count}</span>
            ) : null}
          </button>
        );
      })}
    </fieldset>
  );
}

function ChangeRow({
  item,
  kindMeta,
  defaultOpen
}: {
  item: AiChangeItem;
  kindMeta: Record<AiChangeKind, AiChangeKindMeta>;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const meta = kindMeta[item.kind];
  const hasDetails = Boolean(item.details ?? item.before ?? item.after ?? item.reason);
  const detailsId = `ai-change-${item.id}`;

  return (
    <li className="border-b border-border/60 last:border-b-0" data-kind={item.kind}>
      <div className="flex w-full min-w-0 items-start gap-2 px-3 py-2">
        {item.selectControl ? <div className="mt-0.5 shrink-0">{item.selectControl}</div> : null}
        <button
          type="button"
          className="flex min-w-0 flex-1 items-start gap-2 text-left transition-colors hover:opacity-90 focus-visible:outline-none disabled:cursor-default"
          aria-expanded={hasDetails ? open : undefined}
          aria-controls={hasDetails ? detailsId : undefined}
          disabled={!hasDetails}
          onClick={() => {
            if (hasDetails) setOpen((c) => !c);
          }}
        >
          <span
            aria-hidden
            className={cn("mt-px w-3 shrink-0 font-mono text-xs font-semibold", meta.className)}
          >
            {meta.symbol}
          </span>
          {item.leading ? <div className="shrink-0">{item.leading}</div> : null}
          <span className="min-w-0 flex-1">
            <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
              <span
                className={cn(
                  "rounded-sm px-1 py-0.5 text-[10px] font-medium tracking-wide uppercase",
                  meta.surface,
                  meta.className
                )}
              >
                {meta.label}
              </span>
              {item.badges}
            </span>
            {item.summary ? (
              <span className="mt-0.5 block truncate font-mono text-[11px] text-muted-foreground">
                {item.summary}
              </span>
            ) : null}
            {item.reason && !open ? (
              <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
                {item.reason}
              </span>
            ) : null}
          </span>
          {hasDetails ? (
            <ChevronDownIcon
              aria-hidden
              className={cn(
                "mt-1 size-3.5 shrink-0 text-muted-foreground transition-transform duration-150 motion-reduce:transition-none",
                open && "rotate-180"
              )}
            />
          ) : null}
        </button>
      </div>
      {hasDetails ? (
        <div
          id={detailsId}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-150 motion-reduce:transition-none",
            open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          )}
        >
          <div className="overflow-hidden">
            <div className="border-t border-border/60 bg-muted/20 px-3 py-2.5 pl-12">
              {item.details ?? <AiChangeBeforeAfter before={item.before} after={item.after} />}
              {item.reason ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{item.reason}</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}

export type AiChangeListProps = {
  title: string;
  description?: ReactNode;
  fromLabel?: string;
  toLabel?: string;
  items: AiChangeItem[];
  kindMeta?: Record<AiChangeKind, AiChangeKindMeta>;
  /** Which kinds appear in the filter bar (default all three). */
  filterKinds?: AiChangeKind[];
  emptyMessage?: string;
  className?: string;
  /** Optional toolbar row under filters (e.g. select all). */
  toolbar?: ReactNode;
  maxHeightClassName?: string;
};

export function AiChangeList({
  title,
  description,
  fromLabel,
  toLabel,
  items,
  kindMeta = DEFAULT_AI_CHANGE_KINDS,
  filterKinds = ["added", "modified", "removed"],
  emptyMessage = "No matching changes.",
  className,
  toolbar,
  maxHeightClassName = "max-h-[min(28rem,50vh)]"
}: AiChangeListProps) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const counts = useMemo(() => countKinds(items), [items]);
  const filtered = useMemo(
    () =>
      items.filter((item) => (kind === "all" || item.kind === kind) && matchesSearch(item, query)),
    [items, kind, query]
  );
  const total = counts.added + counts.modified + counts.removed;

  return (
    <section
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card text-card-foreground shadow-xs",
        className
      )}
      data-slot="ai-change-list"
    >
      <header className="flex min-w-0 flex-col gap-2 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">{title}</h3>
          {fromLabel && toLabel ? (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <span className="min-w-0 truncate">{fromLabel}</span>
              <ArrowRightIcon className="size-3 shrink-0 opacity-60" />
              <span className="min-w-0 truncate font-medium text-foreground">{toLabel}</span>
            </p>
          ) : description ? (
            <div className="text-xs text-muted-foreground">{description}</div>
          ) : null}
        </div>
        <div aria-label={`${total} total changes`} className="flex items-center gap-3 text-xs">
          {filterKinds.map((k) => (
            <AiChangeCount key={k} count={counts[k]} kind={k} kindMeta={kindMeta} />
          ))}
        </div>
      </header>

      <div className="flex min-w-0 flex-col gap-2 border-b border-border/60 p-3 sm:flex-row sm:items-center">
        <div className="relative block min-w-0 flex-1">
          <label htmlFor="ai-change-list-search" className="sr-only">
            Search changes
          </label>
          <SearchIcon
            aria-hidden
            className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            id="ai-change-list-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search changes…"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <KindFilterBar
          value={kind}
          onChange={setKind}
          counts={counts}
          kindMeta={kindMeta}
          kinds={filterKinds}
        />
      </div>

      {toolbar ? (
        <div className="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground">
          {toolbar}
        </div>
      ) : null}

      {filtered.length > 0 ? (
        <ul className={cn("overflow-y-auto", maxHeightClassName)}>
          {filtered.map((item) => (
            <ChangeRow key={item.id} item={item} kindMeta={kindMeta} />
          ))}
        </ul>
      ) : (
        <div className="flex min-h-32 items-center justify-center p-6 text-center text-sm text-muted-foreground">
          {items.length === 0 ? emptyMessage : "No matching changes."}
        </div>
      )}
    </section>
  );
}
