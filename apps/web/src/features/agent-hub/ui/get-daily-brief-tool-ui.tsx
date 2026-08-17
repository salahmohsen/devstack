"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { useMarkDailyBriefOpenedMutation } from "@/features/agent-hub/api/mark-daily-brief-opened.mutation";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { toolCallIsOnLatestAssistant } from "@/features/agent-hub/lib/cancel-stale-hub-hitl";
import { requestDailyBrief } from "@/features/agent-hub/lib/daily-brief-host-store";
import { clearEntityInspectRequest } from "@/features/agent-hub/lib/entity-inspect-host-store";
import {
  isPlaceholderDailyBriefMarkdown,
  parseDailyBriefFacts,
  resolveDailyBriefMarkdown
} from "@/features/agent-hub/lib/format-daily-brief";
import { parseGetDailyBriefCounts } from "@/features/agent-hub/lib/hub-tool-names";

type GetDailyBriefResult = {
  markdown?: string;
  inboxCount?: number;
  mailCount?: number;
  trackedCount?: number;
};

export function GetDailyBriefToolUI({
  result,
  toolCallId
}: ToolCallMessagePartProps<Record<string, never>, GetDailyBriefResult>) {
  const { messages } = useHubChat();
  const markOpened = useMarkDailyBriefOpenedMutation();
  const stampedRef = React.useRef(false);
  const facts = parseDailyBriefFacts(result);
  const markdown = resolveDailyBriefMarkdown(
    typeof result?.markdown === "string" ? result.markdown : "",
    facts
  );
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);

  React.useEffect(() => {
    if (!onLatest) return;
    if (!markdown || isPlaceholderDailyBriefMarkdown(markdown)) return;
    const counts = parseGetDailyBriefCounts(result) ?? {
      inboxCount: facts?.inboxCount ?? 0,
      mailCount: facts?.mailCount ?? 0,
      trackedCount: facts?.trackedCount ?? 0
    };
    clearEntityInspectRequest();
    requestDailyBrief({
      requestId: toolCallId,
      markdown,
      inboxCount: counts.inboxCount,
      trackedCount: counts.trackedCount,
      mailCount: counts.mailCount
    });
    if (!stampedRef.current) {
      stampedRef.current = true;
      markOpened.mutate({});
    }
  }, [facts, markOpened, markdown, onLatest, result, toolCallId]);

  return null;
}
