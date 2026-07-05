import { CardFrame, CardFrameHeader } from "@tsu-stack/ui/components/card.js";
import { FrameDescription, FramePanel, FrameTitle } from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { ItemsInfoFooter } from "@/widgets/items-page";

type ItemInfoPanelProps = {
  title: string | React.ReactNode;
  description: string | React.ReactNode;
  children: React.ReactNode;
};

export function ItemInfoPanel({ title, description, children }: ItemInfoPanelProps) {
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
        className="max-h-[calc(100dvh-var(--navbar-height)-200px)] p-4"
        render={<FramePanel />}
      >
        {children}
      </ScrollArea>
      <ItemsInfoFooter />
    </CardFrame>
  );
}
