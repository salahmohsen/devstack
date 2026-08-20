import { GripVertical } from "lucide-react";
import { type ReactNode } from "react";

import { Card, CardContent } from "@tsu-stack/ui/components/card";
import { Checkbox } from "@tsu-stack/ui/components/checkbox";
import { cn } from "@tsu-stack/ui/lib/utils";

import { TiltCard } from "@/shared/ui/motion/tilt-card";

export type ItemGridDragHandleProps = {
  attributes: Record<string, unknown>;
  listeners: Record<string, unknown> | undefined;
  className: string;
};

export type ItemGridCardProps = {
  id: string;
  name: string;
  isOpen: boolean;
  isChecked: boolean;
  batchSelectActive?: boolean;
  isSort?: boolean;
  dragHandleProps?: ItemGridDragHandleProps;
  onOpen: () => void;
  onPrefetch?: () => void;
  onToggleSelect: () => void;
  /** Identity mark (icon, logo, avatar). */
  mark: ReactNode;
  badges?: ReactNode;
  compactActions?: ReactNode;
  wideActions?: ReactNode;
};

/**
 * Compact / poster grid card chrome shared by Skills and Resumes.
 * `@container` lives on the cell (`ItemsGridCell`), not on this card.
 */
export function ItemGridCard({
  id,
  name,
  isOpen,
  isChecked,
  batchSelectActive = false,
  isSort = false,
  dragHandleProps,
  onOpen,
  onPrefetch,
  onToggleSelect,
  mark,
  badges,
  compactActions,
  wideActions
}: ItemGridCardProps) {
  const showLeadingOverlay =
    Boolean(isSort && dragHandleProps) || (!isSort && (isChecked || batchSelectActive));
  const compactActionsForced = isOpen || batchSelectActive;

  const identityRowClassName = cn(
    "relative flex h-11 shrink-0 items-center gap-3 px-2",
    showLeadingOverlay && "ps-8",
    "@[12rem]:h-auto @[12rem]:min-h-0 @[12rem]:flex-1 @[12rem]:flex-col @[12rem]:items-center @[12rem]:justify-center @[12rem]:gap-2 @[12rem]:p-4 @[12rem]:pt-8"
  );

  const titleClassName = cn(
    "col-start-1 row-start-1 m-0 flex h-7 min-w-0 items-center justify-center truncate text-center text-sm leading-none font-medium",
    compactActionsForced
      ? "invisible @[12rem]:visible"
      : "@max-[12rem]:group-focus-within:invisible @max-[12rem]:group-hover:invisible",
    "@[12rem]:line-clamp-2 @[12rem]:block @[12rem]:h-auto @[12rem]:max-w-full @[12rem]:flex-none @[12rem]:leading-snug @[12rem]:wrap-break-word"
  );

  const compactActionsClassName = cn(
    "pointer-events-auto relative z-20 col-start-1 row-start-1 flex h-7 w-fit max-w-full justify-self-center",
    compactActionsForced
      ? "@[12rem]:hidden"
      : "hidden @max-[12rem]:group-focus-within:flex @max-[12rem]:group-hover:flex"
  );

  const wideFooterClassName = cn(
    "pointer-events-none relative z-20 hidden h-10 shrink-0 items-center justify-center px-2 pb-2 @[12rem]:flex",
    "motion-safe:transition-opacity motion-safe:duration-150",
    compactActionsForced
      ? "opacity-100"
      : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
  );

  const sortDragProps =
    isSort && dragHandleProps
      ? { ...dragHandleProps.attributes, ...dragHandleProps.listeners }
      : undefined;

  const markClassName = cn(
    "relative z-1 flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-md",
    "@[12rem]:size-14",
    "[&>*]:size-full [&>*]:max-h-full [&>*]:max-w-full",
    !isSort && "pointer-events-none"
  );

  const cardSurface = (
    <Card
      data-item-id={id}
      data-selected={isOpen}
      aria-label={isSort ? `Reorder ${name}` : undefined}
      {...sortDragProps}
      className={cn(
        "[contain-intrinsic-size:auto_2.75rem] [content-visibility:auto]",
        "@[12rem]:aspect-square @[12rem]:[contain-intrinsic-size:12.5rem]",
        "group relative isolate h-full w-full max-w-full shrink-0 overflow-hidden py-0!",
        "motion-safe:transition-[border-color,box-shadow] motion-safe:duration-150",
        isSort ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer",
        isOpen && "border-primary/50"
      )}
    >
      <div className="relative flex h-full flex-col">
        {isSort && dragHandleProps ? (
          <div
            className="pointer-events-none absolute top-2 left-3 z-20 text-muted-foreground"
            aria-hidden
          >
            <GripVertical className="size-4" />
          </div>
        ) : null}
        {!isSort && (isChecked || batchSelectActive) ? (
          <div data-batch-select className="pointer-events-auto absolute top-2 left-3 z-20">
            <Checkbox
              checked={isChecked}
              onCheckedChange={() => onToggleSelect()}
              aria-label={`Select ${name}`}
            />
          </div>
        ) : null}
        {isSort ? null : (
          <button
            type="button"
            aria-pressed={isOpen}
            aria-label={`View details for ${name}`}
            className="absolute inset-0 z-10 cursor-pointer outline-none focus-visible:ring-0 focus-visible:outline-none"
            onClick={onOpen}
            onMouseEnter={onPrefetch}
          />
        )}
        {isSort ? (
          <CardContent className={cn("p-0", identityRowClassName)}>
            <div className={markClassName}>{mark}</div>
            <p
              className={cn(
                "m-0 flex h-7 min-w-0 flex-1 items-center justify-center truncate text-center text-sm leading-none font-medium",
                "@[12rem]:line-clamp-2 @[12rem]:block @[12rem]:h-auto @[12rem]:max-w-full @[12rem]:flex-none @[12rem]:text-center @[12rem]:leading-snug @[12rem]:wrap-break-word"
              )}
              title={name}
            >
              {name}
            </p>
            {badges ? (
              <div className="hidden max-w-full flex-wrap items-center justify-center gap-1 @[12rem]:flex">
                {badges}
              </div>
            ) : null}
          </CardContent>
        ) : (
          <>
            <div className={cn(identityRowClassName, "pointer-events-none")}>
              <div className={markClassName}>{mark}</div>
              <div className="relative grid h-7 min-w-0 flex-1 grid-cols-1 grid-rows-1 items-center @[12rem]:h-auto @[12rem]:w-full @[12rem]:flex-none">
                <p className={titleClassName} title={name}>
                  {name}
                </p>
                {compactActions ? (
                  <div
                    role="presentation"
                    className={compactActionsClassName}
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    {compactActions}
                  </div>
                ) : null}
              </div>
              {badges ? (
                <div className="hidden max-w-full flex-wrap items-center justify-center gap-1 @[12rem]:flex">
                  {badges}
                </div>
              ) : null}
            </div>
            {wideActions ? (
              <div className={wideFooterClassName}>
                <div
                  role="presentation"
                  className="pointer-events-auto w-fit max-w-full"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  {wideActions}
                </div>
              </div>
            ) : null}
          </>
        )}
      </div>
    </Card>
  );

  if (isSort) return cardSurface;

  return (
    <TiltCard className="h-full w-full" max={10}>
      {cardSurface}
    </TiltCard>
  );
}
