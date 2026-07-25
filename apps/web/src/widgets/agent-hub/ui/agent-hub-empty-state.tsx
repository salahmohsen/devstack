import { Sparkles } from "lucide-react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";

import { HUB_SUGGESTIONS } from "@/features/agent-hub";

import { PromptSuggestion } from "@/components/prompt-kit";

type AgentHubEmptyStateProps = {
  onSelectSuggestion: (prompt: string) => void;
};

export function AgentHubEmptyState({ onSelectSuggestion }: AgentHubEmptyStateProps) {
  return (
    <Empty className="min-h-0 py-10 md:py-16">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Sparkles aria-hidden />
        </EmptyMedia>
        <EmptyTitle>Welcome back. What can I do for you?</EmptyTitle>
        <EmptyDescription>
          Ask about projects, detect stacks, organize your library, or plan the next move.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent className="max-w-xl">
        <div className="flex flex-wrap justify-center gap-2" role="list" aria-label="Suggestions">
          {HUB_SUGGESTIONS.map((suggestion) => (
            <div key={suggestion.id} role="listitem">
              <PromptSuggestion
                type="button"
                size="sm"
                variant="outline"
                className="h-auto rounded-full px-3 py-1.5 text-sm"
                onClick={() => onSelectSuggestion(suggestion.prompt)}
              >
                {suggestion.label}
              </PromptSuggestion>
            </div>
          ))}
        </div>
      </EmptyContent>
    </Empty>
  );
}
