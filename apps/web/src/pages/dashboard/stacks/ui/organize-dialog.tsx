"use client";

import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useEffect, useMemo, useState } from "react";

import { type OrganizeAction, type StackOutput } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { CardFrame } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { AiErrorBanner } from "@/shared/ui/ai-error-banner";
import { Icon } from "@/shared/ui/icon";

const TYPE_LABELS: Record<string, string> = {
  framework: "Framework",
  language: "Language",
  database: "Database",
  ui: "UI",
  auth: "Auth",
  deployment: "Deploy",
  testing: "Testing",
  ai: "AI",
  tooling: "Tooling",
  storage: "Storage",
  "state management": "State",
  other: "Other"
};

const actionVariant = (type: OrganizeAction["type"]) => {
  if (type === "merge") return "destructive" as const;
  if (type === "rename") return "warning" as const;
  return "success" as const;
};

type OrganizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actions: OrganizeAction[];
  sortOrder: string[];
  /** Soft-failure notes from LLM steps (skip / provider errors). */
  notes?: string[];
  stacks: StackOutput[];
  isPending: boolean;
  onConfirm: (selectedActions: OrganizeAction[]) => void;
  onClearSortOrder: () => void;
  /** Re-run organize from the degradation banner. */
  onRetry?: () => void;
};

function actionRowId(action: OrganizeAction, index: number): string {
  return `${action.type}-${action.stackId}-${index}`;
}

export function OrganizeDialog({
  open,
  onOpenChange,
  actions,
  sortOrder,
  notes = [],
  stacks,
  isPending,
  onConfirm,
  onClearSortOrder,
  onRetry
}: OrganizeDialogProps) {
  const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

  const stackById = useMemo(() => new Map(stacks.map((s) => [s.id, s])), [stacks]);

  // All actions selected by default when dialog opens / actions change
  useEffect(() => {
    if (!open) {
      setRowSelection({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (!action) continue;
      next[actionRowId(action, i)] = true;
    }
    setRowSelection(next);
  }, [open, actions]);

  const columns = useMemo<ColumnDef<OrganizeAction & { _rowKey: string }>[]>(
    () => [
      {
        id: "select",
        enableSorting: false,
        header: ({ table }) => {
          const isAllSelected = table.getIsAllPageRowsSelected();
          const isSomeSelected = table.getIsSomePageRowsSelected();
          return (
            <Checkbox
              aria-label="Select all"
              checked={isAllSelected}
              indeterminate={isSomeSelected && !isAllSelected}
              onCheckedChange={(value) => {
                const syntheticEvent = {
                  target: { checked: !!value }
                } as unknown as React.ChangeEvent<HTMLInputElement>;
                table.getToggleAllPageRowsSelectedHandler()(syntheticEvent);
              }}
            />
          );
        },
        cell: ({ row }) => (
          <Checkbox
            aria-label="Select row"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onCheckedChange={(value) => {
              const syntheticEvent = {
                target: { checked: !!value }
              } as unknown as React.ChangeEvent<HTMLInputElement>;
              row.getToggleSelectedHandler()(syntheticEvent);
            }}
          />
        )
      },
      {
        id: "action",
        header: "Action",
        cell: ({ row }) => (
          <Badge variant={actionVariant(row.original.type)} size="sm" className="capitalize">
            {row.original.type}
          </Badge>
        )
      },
      {
        id: "stack",
        header: "Stack",
        cell: ({ row }) => {
          const action = row.original;
          const stack = stackById.get(action.stackId);
          const icon =
            action.type === "enrich" && action.details.newIcon
              ? String(action.details.newIcon)
              : (stack?.icon ?? null);

          return (
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon
                  icon={icon}
                  className="size-4"
                  fallbackToLetter
                  letterClassName="size-8 text-xs"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{action.stackName}</span>
                <p className="line-clamp-2 text-xs text-muted-foreground">{action.reason}</p>
              </div>
            </div>
          );
        }
      },
      {
        id: "change",
        header: "Change",
        cell: ({ row }) => {
          const action = row.original;

          if (action.type === "merge") {
            const intoName = String(action.details.mergeIntoName ?? "unknown");
            const survivor = stacks.find((s) => s.id === action.details.mergeIntoId);
            return (
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">→</span>
                {survivor?.icon ? (
                  <Icon icon={survivor.icon} className="size-4 shrink-0" fallbackToLetter />
                ) : null}
                <span className="truncate text-sm">Merge into “{intoName}”</span>
              </div>
            );
          }

          if (action.type === "rename") {
            return (
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-xs text-muted-foreground">→</span>
                <span className="truncate text-sm font-medium">
                  {String(action.details.newName ?? "unknown")}
                </span>
              </div>
            );
          }

          // enrich
          const type = action.details.newType
            ? (TYPE_LABELS[String(action.details.newType)] ?? String(action.details.newType))
            : null;
          return (
            <div className="flex max-w-sm flex-col gap-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {action.details.newIcon ? (
                  <Icon
                    icon={String(action.details.newIcon)}
                    className="size-5 shrink-0 rounded object-contain"
                  />
                ) : null}
                {type ? (
                  <Badge variant="outline" size="sm">
                    {type}
                  </Badge>
                ) : null}
              </div>
              {action.details.newDescription ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {String(action.details.newDescription)}
                </p>
              ) : null}
              {!action.details.newIcon &&
                !action.details.newType &&
                !action.details.newDescription && (
                  <span className="text-xs text-muted-foreground">No metadata changes</span>
                )}
            </div>
          );
        }
      }
    ],
    [stackById, stacks]
  );

  const tableData = useMemo(
    () =>
      actions.map((action, index) => {
        return { ...action, _rowKey: actionRowId(action, index) };
      }),
    [actions]
  );

  /* eslint-disable react-hooks-js/incompatible-library */
  const table = useReactTable({
    columns,
    data: tableData,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row._rowKey,
    onRowSelectionChange: setRowSelection,
    state: { rowSelection }
  });
  /* eslint-enable react-hooks-js/incompatible-library */

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const hasActions = actions.length > 0;
  const hasSortOnly = !hasActions && sortOrder.length > 0;
  const isEmpty = !hasActions && sortOrder.length === 0;
  const hasNotes = notes.length > 0;

  const summary = useMemo(() => {
    const merges = actions.filter((a) => a.type === "merge").length;
    const renames = actions.filter((a) => a.type === "rename").length;
    const enrichments = actions.filter((a) => a.type === "enrich").length;
    const parts: string[] = [];
    if (merges) parts.push(`${merges} merge${merges === 1 ? "" : "s"}`);
    if (renames) parts.push(`${renames} rename${renames === 1 ? "" : "s"}`);
    if (enrichments) parts.push(`${enrichments} enrichment${enrichments === 1 ? "" : "s"}`);
    if (sortOrder.length > 0) parts.push("reorder");
    return parts.join(" · ");
  }, [actions, sortOrder.length]);

  function handleClose() {
    onOpenChange(false);
    onClearSortOrder();
  }

  function handleConfirm() {
    const selected = table.getFilteredSelectedRowModel().rows.map((row) => {
      const { _rowKey: _, ...action } = row.original;
      return action as OrganizeAction;
    });
    onConfirm(selected);
  }

  const confirmLabel = isPending
    ? "Applying…"
    : isEmpty
      ? "Close"
      : hasSortOnly
        ? "Apply reorder"
        : `Apply selected (${selectedCount})`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup className="sm:max-w-2xl lg:max-w-4xl" showCloseButton={!isPending}>
        <DialogHeader>
          <DialogTitle>Organize Stacks</DialogTitle>
          <DialogDescription>
            Review recommended merges, renames, and enrichments. Conflicting renames are converted
            to merges automatically.
          </DialogDescription>
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
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {summary || "Review changes below."}
                {hasActions ? " All actions are selected by default." : null}
              </p>

              {hasActions ? (
                <CardFrame className="w-full">
                  <Table variant="card">
                    <TableHeader>
                      {table.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id}>
                              {header.isPlaceholder
                                ? null
                                : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {table.getRowModel().rows.length > 0 ? (
                        table.getRowModel().rows.map((row) => (
                          <TableRow data-state={row.getIsSelected() && "selected"} key={row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell className="h-24 text-center" colSpan={columns.length}>
                            No actions.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardFrame>
              ) : null}

              {sortOrder.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  A new importance order will be applied for {sortOrder.length} stack
                  {sortOrder.length === 1 ? "" : "s"}.
                </p>
              ) : null}
            </>
          )}
        </DialogPanel>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" type="button" onClick={handleClose} />}>
            {isEmpty ? "Dismiss" : "Cancel"}
          </DialogClose>
          {isEmpty ? null : (
            <Button
              type="button"
              disabled={isPending || (hasActions && selectedCount === 0 && sortOrder.length === 0)}
              onClick={handleConfirm}
            >
              {confirmLabel}
            </Button>
          )}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
