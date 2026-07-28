import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";

import { Button } from "@tsu-stack/ui/components/button.js";
import { FrameFooter } from "@tsu-stack/ui/components/frame.js";
import { KbdGroup } from "@tsu-stack/ui/components/kbd.js";

import { useItemsNavContext } from "@/widgets/items-page/lib/items-nav-context";

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

type TimestampMetaProps = {
  icon: React.ReactNode;
  label: string;
  value: TimestampValue;
};

function TimestampMeta({ icon, label, value }: TimestampMetaProps) {
  const formatted = formatTimestamp(value);
  if (!formatted) return null;

  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <span className="shrink-0" aria-hidden>
        {icon}
      </span>
      <span>
        {label}{" "}
        <time dateTime={toDateTimeAttr(value)} className="tabular-nums">
          {formatted}
        </time>
      </span>
    </span>
  );
}

export function ItemsInfoFooter({ updatedAt, createdAt }: ItemsInfoFooterProps) {
  const { handlePrev, handleNext } = useItemsNavContext();
  const hasTimestamps = formatTimestamp(updatedAt) != null || formatTimestamp(createdAt) != null;

  return (
    <FrameFooter className="flex flex-row items-center justify-between gap-3 py-2">
      <KbdGroup className="shrink-0">
        <Button variant="ghost" onClick={handlePrev} size="icon">
          <ChevronLeft />
        </Button>
        <Button size="icon" onClick={handleNext} variant="ghost">
          <ChevronRight />
        </Button>
      </KbdGroup>

      {hasTimestamps ? (
        <div className="flex flex-row flex-nowrap items-center justify-end gap-3 overflow-hidden text-xs text-muted-foreground">
          <TimestampMeta
            icon={<Clock className="size-3" strokeWidth={2} />}
            label="Updated"
            value={updatedAt}
          />
          <TimestampMeta
            icon={<Calendar className="size-3" strokeWidth={2} />}
            label="Created"
            value={createdAt}
          />
        </div>
      ) : null}
    </FrameFooter>
  );
}
