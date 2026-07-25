import { Sparkles } from "lucide-react";

import { Avatar, AvatarFallback } from "@tsu-stack/ui/components/avatar";
import { Spinner } from "@tsu-stack/ui/components/spinner";

type AgentHubTypingIndicatorProps = {
  agentName?: string;
};

export function AgentHubTypingIndicator({
  agentName = "Hub Supervisor"
}: AgentHubTypingIndicatorProps) {
  return (
    <div
      className="flex items-center gap-3 px-1 text-sm text-muted-foreground"
      role="status"
      aria-live="polite"
      aria-label={`${agentName} is thinking`}
    >
      <Avatar className="size-8 shrink-0">
        <AvatarFallback className="bg-muted text-muted-foreground">
          <Sparkles className="size-4" aria-hidden />
        </AvatarFallback>
      </Avatar>
      <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1.5">
        <Spinner className="size-3.5" aria-hidden />
        <span>{agentName} is thinking…</span>
      </span>
    </div>
  );
}
