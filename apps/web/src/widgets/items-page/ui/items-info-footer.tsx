import {
  ChevronDownIcon,
  ChevronLeft,
  ChevronLeftIcon,
  ChevronRight,
  ChevronRightIcon,
  ChevronUpIcon,
  CircleIcon
} from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useItemsNavContextOptional } from "@/widgets/items-page/lib/items-nav-context";
import { type ItemsNavLayout } from "@/widgets/items-page/lib/use-items-navigation";

type TimestampValue = string | Date | null | undefined;

type ItemsInfoFooterProps = {
  updatedAt?: TimestampValue;
  createdAt?: TimestampValue;
  /** Override inspect nav chrome. Defaults to the page's ItemsNavProvider layout. */
  navLayout?: ItemsNavLayout;
};

function formatTimestamp(value: TimestampValue): string | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  });
}

function toDateTimeAttr(value: TimestampValue): string | undefined {
  if (value == null) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function TimestampMeta({ label, value }: { label: string; value: TimestampValue }) {
  const formatted = formatTimestamp(value);
  if (!formatted) return null;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="text-muted-foreground/80">{label}</span>
      <time dateTime={toDateTimeAttr(value)} className="text-muted-foreground tabular-nums">
        {formatted}
      </time>
    </span>
  );
}

export function ItemsInfoFooter({ updatedAt, createdAt, navLayout }: ItemsInfoFooterProps) {
  const nav = useItemsNavContextOptional();
  const hasTimestamps = formatTimestamp(updatedAt) != null || formatTimestamp(createdAt) != null;
  const layout = navLayout ?? nav?.layout ?? "list";

  if (!nav && !hasTimestamps) return null;

  return (
    <footer
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-4 py-2 max-xl:pe-20"
      )}
    >
      {nav ? (
        layout === "grid" ? (
          <GridNavPad
            onUp={nav.handleUp}
            onDown={nav.handleDown}
            onPrev={nav.handlePrev}
            onNext={nav.handleNext}
            canUp={nav.canUp}
            canDown={nav.canDown}
            canPrev={nav.canPrev}
            canNext={nav.canNext}
          />
        ) : (
          <div className="flex items-center gap-0.5">
            <Button
              variant="ghost"
              onClick={nav.handlePrev}
              size="icon-sm"
              aria-label="Previous item"
            >
              <ChevronLeft />
            </Button>
            <Button size="icon-sm" onClick={nav.handleNext} variant="ghost" aria-label="Next item">
              <ChevronRight />
            </Button>
          </div>
        )
      ) : (
        <span />
      )}

      {hasTimestamps ? (
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-0.5 overflow-hidden text-[11px]">
          <TimestampMeta label="Updated" value={updatedAt} />
          <TimestampMeta label="Created" value={createdAt} />
        </div>
      ) : null}
    </footer>
  );
}

/** coss p-button-22 directional pad, sized for the inspect footer. */
function GridNavPad({
  onUp,
  onDown,
  onPrev,
  onNext,
  canUp,
  canDown,
  canPrev,
  canNext
}: {
  onUp?: () => void;
  onDown?: () => void;
  onPrev: () => void;
  onNext: () => void;
  canUp: boolean;
  canDown: boolean;
  canPrev: boolean;
  canNext: boolean;
}) {
  return (
    <div className="inline-grid w-fit grid-cols-3 gap-0.5">
      <Button
        aria-label="Previous row"
        className="col-start-2"
        disabled={!canUp}
        onClick={onUp}
        size="icon-sm"
        variant="outline"
      >
        <ChevronUpIcon aria-hidden />
      </Button>
      <Button
        aria-label="Previous item"
        className="col-start-1"
        disabled={!canPrev}
        onClick={onPrev}
        size="icon-sm"
        variant="outline"
      >
        <ChevronLeftIcon aria-hidden />
      </Button>
      <div aria-hidden className="flex items-center justify-center">
        <CircleIcon className="size-3 opacity-80" />
      </div>
      <Button
        aria-label="Next item"
        disabled={!canNext}
        onClick={onNext}
        size="icon-sm"
        variant="outline"
      >
        <ChevronRightIcon aria-hidden />
      </Button>
      <Button
        aria-label="Next row"
        className="col-start-2"
        disabled={!canDown}
        onClick={onDown}
        size="icon-sm"
        variant="outline"
      >
        <ChevronDownIcon aria-hidden />
      </Button>
    </div>
  );
}
