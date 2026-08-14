import { type StackOutput } from "@tsu-stack/core";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon";

const chipClassName = cn(
  // Fixed h + items-center keeps icon glyph and uppercase label on one midline.
  "inline-flex h-5 items-center gap-1 rounded-none border border-transparent bg-muted px-2",
  "text-[0.65rem] leading-none font-medium tracking-wide whitespace-nowrap uppercase",
  "text-primary transition-colors hover:bg-primary/20",
  "font-[inherit] no-underline"
);

function formatStackType(type: string | null | undefined): string | null {
  if (!type?.trim()) return null;
  return type.replace(/[_-]+/g, " ").trim();
}

/**
 * Icon slot matches font-size (1em) so the glyph is the same optical height as
 * the uppercase label; empty slot reserved so chips without icons stay aligned.
 */
function StackChipIcon({ stack, className }: { stack: StackOutput; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-[1em] shrink-0 items-center justify-center overflow-hidden leading-none",
        className
      )}
      aria-hidden
    >
      {stack.icon ? (
        <Icon
          icon={stack.icon}
          name={stack.name}
          className="flex size-full items-center justify-center saturate-0 [&_svg]:block [&_svg]:size-full"
        />
      ) : null}
    </span>
  );
}

/** Uppercase muted chip used on project cards and the public featured row. */
export function StackChip({ stack }: { stack: StackOutput }) {
  const description = stack.description?.trim();
  const typeLabel = formatStackType(stack.type);

  const label = (
    <>
      <StackChipIcon stack={stack} />
      <span className="leading-none">{stack.name}</span>
    </>
  );

  if (!description) {
    return <span className={chipClassName}>{label}</span>;
  }

  return (
    <PreviewCard>
      <PreviewCardTrigger className={cn(chipClassName, "cursor-default")}>
        {label}
      </PreviewCardTrigger>
      <PreviewCardPopup
        className="w-72 flex-col gap-0 p-0 text-start text-pretty shadow-lg/10"
        sideOffset={10}
        align="center"
      >
        <div className="flex items-start gap-3 px-3.5 pt-3.5 pb-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/50">
            {stack.icon ? (
              <Icon icon={stack.icon} name={stack.name} className="size-4" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {stack.name.charAt(0).toUpperCase()}
              </span>
            )}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-sm leading-snug font-semibold text-popover-foreground">
              {stack.name}
            </p>
            {typeLabel ? (
              <p className="text-[0.65rem] leading-none font-medium tracking-wider text-muted-foreground uppercase">
                {typeLabel}
              </p>
            ) : null}
          </div>
        </div>
        <div className="border-t border-border/50 px-3.5 pt-2.5 pb-3.5">
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </PreviewCardPopup>
    </PreviewCard>
  );
}
