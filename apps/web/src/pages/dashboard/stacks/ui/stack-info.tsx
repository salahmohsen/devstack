import { Package } from "lucide-react";

import { type StackOutput } from "@tsu-stack/core/portfolio";
import { Badge } from "@tsu-stack/ui/components/badge";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { ScrollArea } from "@tsu-stack/ui/components/scroll-area";

import { Icon } from "@/shared/ui/icon-picker";
import { Markdown } from "@/shared/ui/markdown";

import { ItemsInfoFooter } from "@/widgets/items-page";

type StackInfoProps = {
  stack: StackOutput | null;
};

export function StackInfo({ stack }: StackInfoProps) {
  if (!stack) return null;

  return (
    <Frame className="me-5 mt-px max-h-[calc(100dvh-var(--navbar-height)-10px)]">
      <FrameHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-3">
            {stack.icon ? (
              <Icon
                nameIcon={stack.icon}
                propsIcon={{ className: "size-10 shrink-0 rounded object-contain" }}
              />
            ) : (
              <Package className="size-10 shrink-0 text-muted-foreground" strokeWidth={1.5} />
            )}
            <div className="min-w-0">
              <FrameTitle className="text-lg">{stack.name}</FrameTitle>
              <FrameDescription>Sort order: {stack.sortOrder}</FrameDescription>
            </div>
          </div>
          {stack.enableAi ? <Badge variant="secondary">AI</Badge> : null}
        </div>
      </FrameHeader>
      <FramePanel className="max-h-fit min-h-0 flex-1 p-0">
        <ScrollArea className="h-full">
          <div className="space-y-4 p-5">
            {stack.description ? (
              <Markdown className="prose prose-sm max-w-none text-foreground dark:prose-invert">
                {stack.description}
              </Markdown>
            ) : (
              <p className="text-sm text-muted-foreground">No description.</p>
            )}
          </div>
        </ScrollArea>
      </FramePanel>
      <ItemsInfoFooter />
    </Frame>
  );
}
