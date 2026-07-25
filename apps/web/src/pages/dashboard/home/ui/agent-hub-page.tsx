import { ClientOnly } from "@tanstack/react-router";

import { Spinner } from "@tsu-stack/ui/components/spinner";

import { AgentHubChat } from "@/widgets/agent-hub";

export function AgentHubPage() {
  return (
    // size-full + overflow-hidden: fill the dashboard ScrollArea content
    // box and keep a single scroll owner (the chat MessageScroller).
    <div className="flex size-full min-h-0 flex-1 flex-col overflow-hidden">
      <ClientOnly
        fallback={
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <Spinner className="size-5" />
            <span className="sr-only">Loading hub chat</span>
          </div>
        }
      >
        <AgentHubChat />
      </ClientOnly>
    </div>
  );
}
