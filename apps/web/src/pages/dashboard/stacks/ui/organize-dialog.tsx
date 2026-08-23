"use client";

import { ArrowRightIcon, SearchIcon, SparklesIcon, StarIcon } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import {
  formatStackTypeLabel,
  normalizeStackType,
  recommendPortfolioInclusion,
  resolveFeaturedStackIds,
  STACK_NOISE_TYPES,
  type OrganizeAction,
  type StackOutput
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Input } from "@tsu-stack/ui/components/input";
import { Switch } from "@tsu-stack/ui/components/switch";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  AiChangeBeforeAfter,
  AiChangeList,
  type AiChangeItem,
  type AiChangeKind,
  type AiChangeKindMeta
} from "@/shared/ui/ai-change-list";
import { AiErrorBanner } from "@/shared/ui/ai-error-banner";
import { Icon } from "@/shared/ui/icon";

type Step = "review" | "portfolio";

/** Map organize actions onto BranchDiff-style kinds for the shared list. */
const ACTION_TO_KIND: Record<OrganizeAction["type"], AiChangeKind> = {
  merge: "removed",
  rename: "modified",
  enrich: "added"
};

const ORGANIZE_KIND_META: Record<AiChangeKind, AiChangeKindMeta> = {
  removed: {
    symbol: "−",
    label: "Merge",
    className: "text-destructive",
    surface: "bg-destructive/8"
  },
  modified: {
    symbol: "~",
    label: "Rename",
    className: "text-amber-600 dark:text-amber-400",
    surface: "bg-amber-500/10"
  },
  added: {
    symbol: "+",
    label: "Enrich",
    className: "text-emerald-600 dark:text-emerald-400",
    surface: "bg-emerald-500/10"
  }
};

export type OrganizeConfirmPayload = {
  actions: OrganizeAction[];
  /** Surviving stacks after selected merges + portfolio / featured flags. */
  portfolio: Array<{ id: string; includedInPortfolio: boolean; isFeatured: boolean }>;
};

type OrganizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: OrganizeAction[];
  sortOrder: string[];
  /** LLM / fallback featured-on-profile ids. */
  featuredStackIds?: string[];
  /** Soft-failure notes from LLM steps (skip / provider errors). */
  notes?: string[];
  stacks: StackOutput[];
  isPending: boolean;
  onConfirm: (payload: OrganizeConfirmPayload) => void;
  onClearSortOrder: () => void;
  /** Re-run organize from the degradation banner. */
  onRetry?: () => void;
};

function actionRowId(action: OrganizeAction, index: number): string {
  return `${action.type}-${action.stackId}-${index}`;
}

function typeLabel(type: string | null | undefined): string | null {
  if (!type) return null;
  return formatStackTypeLabel(type);
}

function StepIndicator({ step }: { step: Step }) {
  const items: Array<{ id: Step; label: string; n: number }> = [
    { id: "review", label: "Review changes", n: 1 },
    { id: "portfolio", label: "Portfolio & profile", n: 2 }
  ];
  return (
    <ol className="flex items-center gap-2 text-xs">
      {items.map((item, i) => {
        const active = item.id === step;
        const done = step === "portfolio" && item.id === "review";
        return (
          <li key={item.id} className="flex items-center gap-2">
            {i > 0 ? <span className="text-muted-foreground/50">/</span> : null}
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium",
                active && "bg-primary/10 text-primary",
                done && "text-muted-foreground",
                !active && !done && "text-muted-foreground/70"
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full border text-[10px] tabular-nums",
                  active && "border-primary bg-primary text-primary-foreground",
                  done && "border-border bg-background text-muted-foreground",
                  !active && !done && "border-border bg-background text-muted-foreground"
                )}
              >
                {item.n}
              </span>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function OrganizeDialog({
  open,
  onOpenChange,
  actions,
  sortOrder,
  featuredStackIds = [],
  notes = [],
  stacks,
  isPending,
  onConfirm,
  onClearSortOrder,
  onRetry
}: OrganizeDialogProps) {
  const [step, setStep] = useState<Step>("review");
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});
  const [portfolioSelection, setPortfolioSelection] = useState<Record<string, boolean>>({});
  const [featuredSelection, setFeaturedSelection] = useState<Record<string, boolean>>({});
  const [portfolioQuery, setPortfolioQuery] = useState("");
  /** coss AlertDialog — same discard pattern as entity forms / settings. */
  const [discardOpen, setDiscardOpen] = useState(false);

  const stackById = useMemo(() => new Map(stacks.map((s) => [s.id, s])), [stacks]);

  // Reset wizard state when dialog closes / actions refresh (external → UI state).
  useEffect(() => {
    if (!open) {
      // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- reset wizard on close
      setStep("review");
      setRowSelection({});
      setPortfolioQuery("");
      setPortfolioSelection({});
      setFeaturedSelection({});
      setDiscardOpen(false);
      return;
    }
    const next: Record<string, boolean> = {};
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action) continue;
      next[actionRowId(action, i)] = true;
    }
    // oxlint-disable-next-line react-hooks-js/set-state-in-effect -- seed selection from actions
    setRowSelection(next);
    setStep("review");
  }, [open, actions]);

  const indexedActions = useMemo(
    () =>
      actions.map((action, index) => {
        return { action, rowKey: actionRowId(action, index) };
      }),
    [actions]
  );

  const selectedActions = useMemo(
    () => indexedActions.filter((a) => rowSelection[a.rowKey]).map((a) => a.action),
    [indexedActions, rowSelection]
  );

  const selectedCount = selectedActions.length;
  const hasActions = actions.length > 0;
  const hasSortOnly = !hasActions && sortOrder.length > 0;
  const hasFeaturedReady = featuredStackIds.length > 0;
  const isEmpty = !hasActions && sortOrder.length === 0 && !hasFeaturedReady;
  const hasNotes = notes.length > 0;

  // Static change payloads — selection is layered on so checkbox toggles don't rebuild bodies.
  const baseChangeItems = useMemo(
    () =>
      indexedActions.map(({ action, rowKey }) => {
        const stack = stackById.get(action.stackId);
        const kind = ACTION_TO_KIND[action.type];
        const icon =
          action.type === "enrich" && action.details.newIcon
            ? String(action.details.newIcon)
            : (stack?.icon ?? null);
        const survivor =
          action.type === "merge" && action.details.mergeIntoId
            ? stackById.get(String(action.details.mergeIntoId))
            : undefined;

        let summary = "";
        let before: string | null | undefined;
        let after: string | null | undefined;
        let details: ReactNode | undefined;

        if (action.type === "merge") {
          summary = `→ ${String(action.details.mergeIntoName ?? "unknown")}`;
          details = (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted-foreground line-through">{action.stackName}</span>
              <ArrowRightIcon className="size-3.5 text-muted-foreground" />
              <span className="inline-flex items-center gap-1.5 font-medium">
                {survivor?.icon ? (
                  <Icon icon={survivor.icon} className="size-4" fallbackToLetter />
                ) : null}
                {String(action.details.mergeIntoName ?? "unknown")}
              </span>
            </div>
          );
        } else if (action.type === "rename") {
          const aliases = (action.details.aliases ?? []).filter(Boolean);
          summary = `→ ${String(action.details.newName ?? "unknown")}`;
          before = action.stackName;
          after = String(action.details.newName ?? "");
          if (aliases.length > 0) {
            details = (
              <p className="text-xs text-muted-foreground">Also known as: {aliases.join(", ")}</p>
            );
          }
        } else {
          const parts: string[] = [];
          if (action.details.newType) {
            parts.push(typeLabel(String(action.details.newType)) ?? String(action.details.newType));
          }
          if (action.details.newIcon) parts.push("icon");
          if (action.details.newDescription) parts.push("description");
          summary = parts.join(" · ") || "metadata";
          details = (
            <div className="space-y-2">
              {action.details.newType ? (
                <AiChangeBeforeAfter
                  before={typeLabel(stack?.type) ?? stack?.type}
                  after={typeLabel(String(action.details.newType))}
                />
              ) : null}
              {action.details.newDescription ? (
                <AiChangeBeforeAfter
                  before={stack?.description}
                  after={String(action.details.newDescription)}
                />
              ) : null}
              {action.details.newIcon ? (
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>Icon</span>
                  <Icon
                    icon={String(action.details.newIcon)}
                    className="size-6 rounded object-contain"
                  />
                </div>
              ) : null}
              {!action.details.newType &&
              !action.details.newDescription &&
              !action.details.newIcon ? (
                <p className="text-xs text-muted-foreground">No metadata field changes.</p>
              ) : null}
            </div>
          );
        }

        return {
          id: rowKey,
          kind,
          title: action.stackName,
          summary,
          reason: action.reason,
          before,
          after,
          details,
          leading: (
            <div className="flex size-7 items-center justify-center rounded-md bg-muted">
              <Icon
                icon={icon}
                className="size-3.5"
                fallbackToLetter
                letterClassName="size-7 text-[10px]"
              />
            </div>
          ),
          actionType: action.type,
          searchText: [action.type, action.details.mergeIntoName, action.details.newName]
            .filter(Boolean)
            .join(" ")
        };
      }),
    [indexedActions, stackById]
  );

  const changeItems: AiChangeItem[] = useMemo(
    () =>
      baseChangeItems.map((item) => {
        return {
          ...item,
          selectControl: (
            <Checkbox
              aria-label={`Select ${item.actionType} for ${item.title}`}
              checked={!!rowSelection[item.id]}
              onCheckedChange={(v) => {
                setRowSelection((prev) => {
                  return { ...prev, [item.id]: !!v };
                });
              }}
            />
          )
        };
      }),
    [baseChangeItems, rowSelection]
  );

  const survivingStacks = useMemo(() => {
    const victims = new Set(
      selectedActions.filter((a) => a.type === "merge").map((a) => a.stackId)
    );
    const renameMap = new Map(
      selectedActions
        .filter((a) => a.type === "rename" && a.details.newName)
        .map((a) => [a.stackId, String(a.details.newName)])
    );
    const enrichType = new Map(
      selectedActions
        .filter((a) => a.type === "enrich" && a.details.newType)
        .map((a) => [a.stackId, String(a.details.newType)])
    );
    const enrichIcon = new Map(
      selectedActions
        .filter((a) => a.type === "enrich" && a.details.newIcon)
        .map((a) => [a.stackId, String(a.details.newIcon)])
    );

    return stacks
      .filter((s) => !victims.has(s.id))
      .map((s) => {
        return {
          ...s,
          name: renameMap.get(s.id) ?? s.name,
          type: enrichType.get(s.id) ?? s.type,
          icon: enrichIcon.get(s.id) ?? s.icon
        };
      });
  }, [stacks, selectedActions]);

  function seedPortfolioDefaults() {
    const survivingOrder = sortOrder.filter((id) => survivingStacks.some((s) => s.id === id));
    const candidates = survivingStacks.map((s) => {
      return {
        id: s.id,
        name: s.name,
        type: s.type,
        projectCount: s.projectCount,
        includedInPortfolio: s.includedInPortfolio,
        isFeatured: s.isFeatured
      };
    });
    const featuredIds = resolveFeaturedStackIds({
      llmIds: featuredStackIds,
      stacks: candidates,
      sortOrder: survivingOrder
    });
    const featuredSet = new Set(featuredIds);
    const recommended = recommendPortfolioInclusion(candidates, survivingOrder);
    const nextPortfolio: Record<string, boolean> = {};
    const nextFeatured: Record<string, boolean> = {};
    for (const s of survivingStacks) {
      const featured = featuredSet.has(s.id);
      nextFeatured[s.id] = featured;
      nextPortfolio[s.id] = featured || recommended.has(s.id);
    }
    setFeaturedSelection(nextFeatured);
    setPortfolioSelection(nextPortfolio);
  }

  const portfolioIncludedCount = useMemo(
    () => Object.values(portfolioSelection).filter(Boolean).length,
    [portfolioSelection]
  );

  const featuredCount = useMemo(
    () => Object.values(featuredSelection).filter(Boolean).length,
    [featuredSelection]
  );

  const filteredPortfolioStacks = useMemo(() => {
    const q = portfolioQuery.trim().toLowerCase();
    const rank = new Map(sortOrder.map((id, i) => [id, i]));
    const list = [...survivingStacks].toSorted((a, b) => {
      const ar = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER;
      const br = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER;
      if (ar !== br) return ar - br;
      return a.name.localeCompare(b.name);
    });
    if (!q) return list;
    return list.filter((s) => {
      const hay = [s.name, s.type, s.description].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [survivingStacks, sortOrder, portfolioQuery]);

  function requestClose() {
    if (hasUnsavedOrganize && !isEmpty) {
      setDiscardOpen(true);
      return;
    }
    onOpenChange(false);
    onClearSortOrder();
  }

  function confirmDiscard() {
    setDiscardOpen(false);
    onOpenChange(false);
    onClearSortOrder();
  }

  function handleContinueToPortfolio() {
    if (hasActions && selectedCount === 0 && sortOrder.length === 0 && !hasFeaturedReady) return;
    seedPortfolioDefaults();
    setStep("portfolio");
  }

  function handleConfirm() {
    const portfolio = survivingStacks.map((s) => {
      const featured = !!featuredSelection[s.id];
      return {
        id: s.id,
        includedInPortfolio: featured || !!portfolioSelection[s.id],
        isFeatured: featured
      };
    });
    onConfirm({ actions: selectedActions, portfolio });
  }

  function toggleAll(next: boolean) {
    setRowSelection((prev) => {
      const copy = { ...prev };
      for (const { rowKey } of indexedActions) {
        copy[rowKey] = next;
      }
      return copy;
    });
  }

  function setAllPortfolio(next: boolean) {
    setPortfolioSelection((prev) => {
      const copy = { ...prev };
      for (const s of filteredPortfolioStacks) {
        copy[s.id] = next;
      }
      return copy;
    });
    if (!next) {
      setFeaturedSelection((prev) => {
        const copy = { ...prev };
        for (const s of filteredPortfolioStacks) {
          copy[s.id] = false;
        }
        return copy;
      });
    }
  }

  const confirmLabel = isPending
    ? "Applying…"
    : step === "review"
      ? isEmpty
        ? "Close"
        : "Continue"
      : `Apply (${selectedCount} change${selectedCount === 1 ? "" : "s"} · ${featuredCount} featured · ${portfolioIncludedCount} on portfolio)`;

  const hasUnsavedOrganize =
    isPending ||
    selectedCount > 0 ||
    (step === "portfolio" &&
      (Object.values(portfolioSelection).some(Boolean) ||
        Object.values(featuredSelection).some(Boolean)));

  const handleOpenChange = (next: boolean) => {
    if (next) {
      onOpenChange(true);
      return;
    }
    requestClose();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogPopup className="sm:max-w-2xl lg:max-w-4xl" showCloseButton={!isPending}>
          <DialogHeader>
            <DialogTitle>Organize skills</DialogTitle>
            <DialogDescription>
              {step === "review"
                ? "Review AI-proposed merges, renames, and enrichments. Expand a row for before / after."
                : "Feature a tight resume-style skills row on your profile. Keep the broader portfolio for everything else."}
            </DialogDescription>
            {!isEmpty ? <StepIndicator step={step} /> : null}
          </DialogHeader>

          <DialogPanel className="flex flex-col gap-4">
            {hasNotes ? (
              <AiErrorBanner
                notes={notes}
                feature="organize"
                severity="partial"
                density="compact"
                onRetry={
                  onRetry && !isPending
                    ? () => {
                        onRetry();
                      }
                    : undefined
                }
              />
            ) : null}

            {isEmpty ? (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {hasNotes
                  ? "Nothing ready to apply yet."
                  : "Nothing to apply — your stacks are already organized."}
              </div>
            ) : step === "review" ? (
              hasActions ? (
                <AiChangeList
                  title="Proposed changes"
                  fromLabel="Current catalog"
                  toLabel={
                    sortOrder.length > 0
                      ? `Organized · reorder ${sortOrder.length}`
                      : "Organized catalog"
                  }
                  items={changeItems}
                  kindMeta={ORGANIZE_KIND_META}
                  filterKinds={["removed", "modified", "added"]}
                  emptyMessage="No proposed changes."
                  toolbar={
                    <>
                      <span>
                        {selectedCount} of {actions.length} selected
                      </span>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="font-medium hover:text-foreground"
                          onClick={() => toggleAll(true)}
                        >
                          Select all
                        </button>
                        <button
                          type="button"
                          className="font-medium hover:text-foreground"
                          onClick={() => toggleAll(false)}
                        >
                          Clear all
                        </button>
                      </div>
                    </>
                  }
                />
              ) : (
                <div className="rounded-lg border border-border/70 p-4 text-sm text-muted-foreground">
                  {hasSortOnly
                    ? "No merges, renames, or enrichments — only an importance reorder is ready. Continue to set profile and portfolio."
                    : hasFeaturedReady
                      ? "No catalog edits — continue to review the auto-selected profile stacks."
                      : null}
                </div>
              )
            ) : (
              <section className="w-full min-w-0 overflow-hidden rounded-lg border border-border/70 bg-card shadow-xs">
                <header className="flex min-w-0 flex-col gap-2 border-b border-border/60 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold">Profile & portfolio</h3>
                    <p className="text-xs text-muted-foreground">
                      Stars land on the public profile row (resume Skills). The switch adds the rest
                      to the portfolio.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="brand" size="sm" className="tabular-nums">
                      {featuredCount} featured
                    </Badge>
                    <Badge variant="outline" size="sm" className="tabular-nums">
                      {portfolioIncludedCount} / {survivingStacks.length} portfolio
                    </Badge>
                  </div>
                </header>

                <div className="flex min-w-0 flex-col gap-2 border-b border-border/60 p-3 sm:flex-row sm:items-center">
                  <div className="relative block min-w-0 flex-1">
                    <label htmlFor="organize-portfolio-search" className="sr-only">
                      Search stacks
                    </label>
                    <SearchIcon
                      aria-hidden
                      className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
                    />
                    <Input
                      id="organize-portfolio-search"
                      type="search"
                      value={portfolioQuery}
                      onChange={(e) => setPortfolioQuery(e.target.value)}
                      placeholder="Search stacks…"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 gap-1 text-xs"
                      onClick={seedPortfolioDefaults}
                    >
                      <SparklesIcon className="size-3.5" />
                      Recommend
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setAllPortfolio(true)}
                    >
                      Include all
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() => setAllPortfolio(false)}
                    >
                      Exclude all
                    </Button>
                  </div>
                </div>

                <ul className="max-h-[min(28rem,50vh)] overflow-y-auto">
                  {filteredPortfolioStacks.map((s) => {
                    const included = !!portfolioSelection[s.id];
                    const featured = !!featuredSelection[s.id];
                    const wasIncluded = !!s.includedInPortfolio;
                    const wasFeatured = !!s.isFeatured;
                    const type = typeLabel(s.type);
                    const noise = STACK_NOISE_TYPES.has(normalizeStackType(s.type));
                    return (
                      <li
                        key={s.id}
                        className="flex items-center gap-3 border-b border-border/60 px-3 py-2 last:border-b-0"
                      >
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon
                            icon={s.icon}
                            className="size-4"
                            fallbackToLetter
                            letterClassName="size-8 text-xs"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="truncate text-sm font-medium">{s.name}</span>
                            {type ? (
                              <Badge variant="outline" size="sm">
                                {type}
                              </Badge>
                            ) : null}
                            {noise ? (
                              <span className="text-[10px] tracking-wide text-muted-foreground uppercase">
                                often noise
                              </span>
                            ) : null}
                            {wasFeatured !== featured ? (
                              <span
                                className={cn(
                                  "text-[10px] font-medium tracking-wide uppercase",
                                  featured
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                )}
                              >
                                {featured ? "will feature" : "will unfeature"}
                              </span>
                            ) : null}
                            {wasIncluded !== included ? (
                              <span
                                className={cn(
                                  "text-[10px] font-medium tracking-wide uppercase",
                                  included
                                    ? "text-emerald-600 dark:text-emerald-400"
                                    : "text-destructive"
                                )}
                              >
                                {included ? "will include" : "will remove"}
                              </span>
                            ) : null}
                          </div>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {s.projectCount} project{s.projectCount === 1 ? "" : "s"}
                            {s.description ? ` · ${s.description}` : null}
                          </p>
                        </div>
                        <Button
                          type="button"
                          size="icon-sm"
                          variant={featured ? "default" : "ghost"}
                          aria-label={
                            featured
                              ? `Remove ${s.name} from profile`
                              : `Feature ${s.name} on profile`
                          }
                          aria-pressed={featured}
                          onClick={() => {
                            const next = !featured;
                            setFeaturedSelection((prev) => {
                              return { ...prev, [s.id]: next };
                            });
                            if (next) {
                              setPortfolioSelection((prev) => {
                                return { ...prev, [s.id]: true };
                              });
                            }
                          }}
                        >
                          <StarIcon
                            className="size-3.5"
                            fill={featured ? "currentColor" : "none"}
                            strokeWidth={featured ? 1.75 : 2}
                          />
                        </Button>
                        <Switch
                          checked={included}
                          aria-label={`${included ? "Exclude" : "Include"} ${s.name} on portfolio`}
                          onCheckedChange={(v) => {
                            const on = !!v;
                            setPortfolioSelection((prev) => {
                              return { ...prev, [s.id]: on };
                            });
                            if (!on) {
                              setFeaturedSelection((prev) => {
                                return { ...prev, [s.id]: false };
                              });
                            }
                          }}
                        />
                      </li>
                    );
                  })}
                  {filteredPortfolioStacks.length === 0 ? (
                    <li className="p-6 text-center text-sm text-muted-foreground">
                      No stacks match this search.
                    </li>
                  ) : null}
                </ul>
              </section>
            )}
          </DialogPanel>

          <DialogFooter>
            {step === "portfolio" ? (
              <Button
                type="button"
                variant="outline"
                disabled={isPending}
                onClick={() => setStep("review")}
              >
                Back
              </Button>
            ) : (
              <Button type="button" variant="outline" disabled={isPending} onClick={requestClose}>
                {isEmpty ? "Dismiss" : "Cancel"}
              </Button>
            )}
            {isEmpty ? null : step === "review" ? (
              <Button
                type="button"
                disabled={
                  isPending ||
                  (hasActions && selectedCount === 0 && sortOrder.length === 0 && !hasFeaturedReady)
                }
                onClick={handleContinueToPortfolio}
              >
                {confirmLabel}
              </Button>
            ) : (
              <Button type="button" loading={isPending} onClick={handleConfirm}>
                {confirmLabel}
              </Button>
            )}
          </DialogFooter>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved organize changes. Close without applying them?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep reviewing</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDiscard}>Discard</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
