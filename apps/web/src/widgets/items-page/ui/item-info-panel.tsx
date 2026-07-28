import { CardFrame, CardFrameHeader } from "@tsu-stack/ui/components/card.js";
import { FrameDescription, FramePanel, FrameTitle } from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";
import { cn } from "@tsu-stack/ui/lib/utils";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ItemInfoPanelProps = {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  children: React.ReactNode;
  /** Passed through to the shared side-panel footer. */
  updatedAt?: string | Date | null;
  /** Passed through to the shared side-panel footer. */
  createdAt?: string | Date | null;
  className?: string;
};

export function ItemInfoPanel({
  title,
  description,
  children,
  updatedAt,
  createdAt,
  className
}: ItemInfoPanelProps) {
  return (
    <CardFrame className="me-5 mt-px grid max-h-[calc(100dvh-var(--navbar-height)-10px)] overflow-hidden">
      <CardFrameHeader>
        {typeof title === "string" ? <FrameTitle className="text-lg">{title}</FrameTitle> : title}
        {typeof description === "string" ? (
          <FrameDescription>{description}</FrameDescription>
        ) : (
          description
        )}
      </CardFrameHeader>
      <ScrollArea
        className={cn("max-h-[calc(100dvh-var(--navbar-height)-200px)] p-4", className)}
        render={<FramePanel />}
      >
        {children}
      </ScrollArea>
      <ItemsInfoFooter updatedAt={updatedAt} createdAt={createdAt} />
    </CardFrame>
  );
}
