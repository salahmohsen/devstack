"use client";
import { type ColumnDef, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { useMemo, useState } from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type DetectStacksResult, type DetectedStack } from "@tsu-stack/core";
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
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { Icon } from "@/shared/ui/icon";

const confidenceVariant = (confidence: string) => {
  if (confidence === "high") return "success";
  if (confidence === "medium") return "warning";
  return "error";
};

const typeLabel = (type: string) => {
  const labels: Record<string, string> = {
    framework: "Framework",
    language: "Language",
    database: "Database",
    ui: "UI",
    auth: "Auth",
    deployment: "Deployment",
    testing: "Testing",
    ai: "AI",
    tooling: "Tooling",
    storage: "Storage",
    other: "Other"
  };
  return labels[type] ?? type;
};

export function DetectStacksDialog({
  open,
  setOpen,
  onStacksSelected,
  isDetecting,
  results
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onStacksSelected: (stackIds: string[]) => Promise<void>;
  isDetecting: boolean;
  results: DetectStacksResult | null;
}) {
  const [rowSelection, setRowSelection] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allStacks = useMemo(() => {
    if (!results?.detectedStacks) return [];
    return results.detectedStacks;
  }, [results]);

  const columns = useMemo<ColumnDef<DetectedStack>[]>(
    () => [
      {
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
        ),
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
        id: "select"
      },
      {
        accessorKey: "name",
        cell: ({ row }) => {
          const stack = row.original;
          return (
            <div className="flex items-center gap-3">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon
                  icon={stack.iconSvg}
                  className="size-4"
                  fallbackToLetter
                  letterClassName="size-8 text-xs"
                />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-sm font-medium">{stack.name}</span>
                {stack.description && (
                  <p className="truncate text-xs text-muted-foreground">{stack.description}</p>
                )}
              </div>
            </div>
          );
        },
        header: "Stack"
      },
      {
        accessorKey: "relatedPackages",
        cell: ({ row }) => {
          const stack = row.original;
          const firstThree = stack.relatedPackages?.slice(0, 3);
          const remainingPackages = stack.relatedPackages?.slice(3);
          return (
            <div className="flex max-w-sm flex-wrap gap-1">
              {firstThree?.map((pkg) => (
                <Badge variant="secondary" size="sm" key={pkg}>
                  {pkg}
                </Badge>
              ))}
              {!!remainingPackages?.length && (
                <PreviewCard>
                  <PreviewCardTrigger render={<Badge variant="secondary" size="sm" />}>
                    +{remainingPackages.length}
                  </PreviewCardTrigger>
                  <PreviewCardPopup className="flex w-md flex-wrap gap-1 p-1">
                    {remainingPackages.map((pkg) => (
                      <Badge variant="secondary" size="sm" key={pkg}>
                        {pkg}
                      </Badge>
                    ))}
                  </PreviewCardPopup>
                </PreviewCard>
              )}
            </div>
          );
        },
        header: "Related Packages"
      },
      {
        accessorKey: "confidence",
        cell: ({ row }) => (
          <Badge variant={confidenceVariant(row.original.confidence)} size="sm">
            {row.original.confidence}
          </Badge>
        ),
        header: "Confidence"
      },
      {
        accessorKey: "type",
        cell: ({ row }) => (
          <Badge variant="outline" size="sm">
            {typeLabel(row.original.type)}
          </Badge>
        ),
        header: "Type"
      },
      {
        id: "status",
        cell: ({ row }) => {
          const stack = row.original;
          return (
            <div className="flex gap-1">
              {stack.health?.deprecated && (
                <Badge variant="error" size="sm">
                  Deprecated
                </Badge>
              )}
              {stack.exists && (
                <Badge variant="secondary" size="sm">
                  Existing
                </Badge>
              )}
            </div>
          );
        },
        header: "Status"
      }
    ],
    []
  );

  /* eslint-disable react-hooks-js/incompatible-library */
  const table = useReactTable({
    columns,
    data: allStacks,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection }
  });
  /* eslint-enable react-hooks-js/incompatible-library */

  const handleAddSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0 || !results) return;

    setIsSubmitting(true);

    try {
      const selectedDetected = selectedRows.map((row) => row.original);

      const upserted = await orpcClient.stacks.upsertFromDetection({
        stacks: selectedDetected.map((s) => {
          return {
            npmPackage: s.npmPackage,
            name: s.name,
            type: s.type,
            description: s.description,
            confidence: s.confidence,
            iconSvg: s.iconSvg,
            relatedPackages: s.relatedPackages
          };
        })
      });

      const stackIds = upserted.map((s) => s.id);
      await onStacksSelected(stackIds);
      setOpen(false);
    } catch {
      // Error handled by upstream caller
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasResults = allStacks.length > 0;
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogPopup className="sm:max-w-2xl lg:max-w-fit">
        <DialogHeader>
          <DialogTitle>Detect Stacks from Repositories</DialogTitle>
          <DialogDescription>
            Identify the technologies used in your linked repositories.
          </DialogDescription>
        </DialogHeader>

        {hasResults ? (
          <DialogPanel className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              {allStacks.length} stacks found across {results!.groupedByRepo?.length ?? 0}{" "}
              repositories
            </p>

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
                  {table.getRowModel().rows?.length ? (
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
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardFrame>

            {results!.groupedByRepo?.length > 0 && (
              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none">View by repository</summary>
                <div className="mt-2 flex flex-col gap-2">
                  {results!.groupedByRepo.map(
                    ({
                      repo,
                      stacks
                    }: {
                      repo: string;
                      stacks: DetectStacksResult["detectedStacks"];
                    }) => (
                      <div
                        key={repo}
                        className="flex flex-col gap-1 rounded-lg border border-border bg-muted/50 p-3"
                      >
                        <p className="text-xs font-medium text-muted-foreground">
                          {repo.replace("https://github.com/", "")}
                        </p>
                        {stacks.map((s) => (
                          <span key={s.npmPackage} className="text-xs">
                            {s.name}
                          </span>
                        ))}
                      </div>
                    )
                  )}
                </div>
              </details>
            )}
          </DialogPanel>
        ) : isDetecting ? (
          <DialogPanel>
            <div className="py-8 text-center text-muted-foreground">Detecting stacks...</div>
          </DialogPanel>
        ) : (
          <DialogPanel>
            <div className="py-8 text-center text-muted-foreground">
              No stacks detected. Please check your repositories.
            </div>
          </DialogPanel>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
          <Button
            onClick={() => void handleAddSelected()}
            disabled={isSubmitting || selectedCount === 0}
          >
            {isSubmitting ? "Adding..." : `Add Selected (${selectedCount})`}
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
