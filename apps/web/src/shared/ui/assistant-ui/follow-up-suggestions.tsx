"use client";

import { AuiIf, useAui, useAuiState } from "@assistant-ui/react";
import { useEffect, useState, type FC } from "react";

import { Suggestions } from "@/shared/ui/suggestions";

const FollowupSuggestionsRow: FC = () => {
  const aui = useAui();
  const suggestions = useAuiState((s) => s.thread.suggestions);
  const lastId = useAuiState((s) => s.thread.messages.at(-1)?.id ?? "");
  const [selected, setSelected] = useState<string | null>(null);
  const [cycle, setCycle] = useState(0);

  useEffect(() => {
    setSelected(null);
    setCycle((value) => value + 1);
  }, [lastId]);

  const prompts = suggestions.map((row) => row.prompt).filter((prompt) => prompt.length > 0);
  if (prompts.length === 0) return null;

  return (
    <Suggestions
      suggestions={prompts}
      selectedSuggestion={selected}
      cycle={cycle}
      variant="pills"
      className="aui-thread-followup-suggestions mb-1 w-full max-w-none justify-start"
      onSuggestion={(prompt) => {
        setSelected(prompt);
        aui.thread.append({ role: "user", content: [{ type: "text", text: prompt }] });
      }}
    />
  );
};

export const ThreadFollowupSuggestions: FC = () => (
  <AuiIf
    condition={(s) => !s.thread.isEmpty && !s.thread.isRunning && s.thread.suggestions.length > 0}
  >
    <FollowupSuggestionsRow />
  </AuiIf>
);
