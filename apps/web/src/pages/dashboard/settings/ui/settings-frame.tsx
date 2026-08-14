import { type ReactNode } from "react";

import { ButtonAnimateScope } from "@tsu-stack/ui/components/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

type SettingsFrameProps = {
  title: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/**
 * Full-height settings card: header (title + actions) stays put;
 * body scrolls in a ScrollArea so the page chrome does not.
 */
export function SettingsFrame({
  title,
  description,
  icon,
  actions,
  children,
  className,
  contentClassName
}: SettingsFrameProps) {
  return (
    <Frame className={cn("flex h-full min-h-0 flex-1 flex-col overflow-hidden", className)}>
      <FrameHeader className="flex shrink-0 flex-row items-start justify-between gap-3">
        <div className="min-w-0 space-y-0.5">
          <FrameTitle className="flex items-center gap-2">
            {icon}
            {title}
          </FrameTitle>
          {description ? (
            <FrameDescription
              className="max-w-md text-xs text-pretty md:line-clamp-1 lg:max-w-lg"
              title={typeof description === "string" ? description : undefined}
            >
              {description}
            </FrameDescription>
          ) : null}
        </div>
        {actions ? (
          <ButtonAnimateScope>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">{actions}</div>
          </ButtonAnimateScope>
        ) : null}
      </FrameHeader>
      <FramePanel className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        <ScrollArea className="h-full min-h-0" scrollFade scrollbarGutter>
          <div className={cn("space-y-8 p-5", contentClassName)}>{children}</div>
        </ScrollArea>
      </FramePanel>
    </Frame>
  );
}
