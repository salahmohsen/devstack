import { type ReactNode } from "react";

import { type StackOutput } from "@tsu-stack/core";
import {
  PreviewCard,
  PreviewCardPopup,
  PreviewCardTrigger
} from "@tsu-stack/ui/components/preview-card";
import { cn } from "@tsu-stack/ui/lib/utils";

import { Icon } from "@/shared/ui/icon";

function formatStackType(type: string | null | undefined): string | null {
  if (!type?.trim()) return null;
  return type.replace(/[_-]+/g, " ").trim();
}

export function StackPreviewPopupBody({ stack }: { stack: StackOutput }) {
  const description = stack.description?.trim();
  const typeLabel = formatStackType(stack.type);

  return (
    <>
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
          <p className="text-sm leading-snug font-semibold text-popover-foreground">{stack.name}</p>
          {typeLabel ? (
            <p className="text-[0.65rem] leading-none font-medium tracking-wider text-muted-foreground uppercase">
              {typeLabel}
            </p>
          ) : null}
        </div>
      </div>
      {description ? (
        <div className="border-t border-border/50 px-3.5 pt-2.5 pb-3.5">
          <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      ) : null}
    </>
  );
}

export function StackPreviewCard({
  stack,
  children,
  triggerClassName
}: {
  stack: StackOutput;
  children: ReactNode;
  triggerClassName?: string;
}) {
  return (
    <PreviewCard>
      <PreviewCardTrigger className={cn("cursor-default", triggerClassName)}>
        {children}
      </PreviewCardTrigger>
      <PreviewCardPopup
        className="w-72 flex-col gap-0 p-0 text-start text-pretty shadow-lg/10"
        sideOffset={10}
        align="center"
      >
        <StackPreviewPopupBody stack={stack} />
      </PreviewCardPopup>
    </PreviewCard>
  );
}
