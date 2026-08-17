"use client";

import * as React from "react";

import { Suggestions } from "@/shared/ui/suggestions";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { hubFollowupPrompts } from "@/features/agent-hub/lib/hub-follow-up-prompts";

export function HubFollowupSuggestions() {
  const { messages, sendMessage, status } = useHubChat();
  const isRunning = status === "submitted" || status === "streaming";
  const lastId = messages.at(-1)?.id ?? "";
  const suggestions = React.useMemo(() => hubFollowupPrompts(messages), [messages]);
  const [selected, setSelected] = React.useState<string | null>(null);
  const [cycle, setCycle] = React.useState(0);

  React.useEffect(() => {
    setSelected(null);
    setCycle((value) => value + 1);
  }, [lastId]);

  if (isRunning || suggestions.length === 0) return null;

  return (
    <Suggestions
      suggestions={suggestions}
      selectedSuggestion={selected}
      cycle={cycle}
      variant="pills"
      className="mb-2 w-full max-w-none justify-start"
      onSuggestion={(prompt) => {
        setSelected(prompt);
        void sendMessage({ text: prompt });
      }}
    />
  );
}
