import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useItemsNavContextOptional } from "@/widgets/items-page/lib/items-nav-context";

type TimestampValue = string | Date | null | undefined;

type ItemsInfoFooterProps = {
  updatedAt?: TimestampValue;
  createdAt?: TimestampValue;
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

export function ItemsInfoFooter({ updatedAt, createdAt }: ItemsInfoFooterProps) {
  const nav = useItemsNavContextOptional();
  const hasTimestamps = formatTimestamp(updatedAt) != null || formatTimestamp(createdAt) != null;

  if (!nav && !hasTimestamps) return null;

  return (
    <footer
      className={cn(
        "flex shrink-0 items-center justify-between gap-3 border-t border-border/50 px-4 py-2"
      )}
    >
      {nav ? (
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
