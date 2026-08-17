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
  resolveDailyBriefMarkdown
} from "@/features/agent-hub/lib/format-daily-brief";
import {
  isOpenDailyBriefToolName,
  latestDailyBriefCountsFromMessages,
  latestDailyBriefFactsFromMessages
} from "@/features/agent-hub/lib/hub-tool-names";

const OPEN_DAILY_BRIEF_TOOL_ID = "open-daily-brief";

export type OpenDailyBriefInput = {
  markdown: string;
};

export type OpenDailyBriefOutput = {
  opened: boolean;
  markdown: string;
};

function parseMarkdown(args: unknown, result: unknown): string {
  if (result && typeof result === "object" && !Array.isArray(result)) {
    const markdown = (result as { markdown?: unknown }).markdown;
    if (typeof markdown === "string" && markdown.trim().length > 0) return markdown;
  }
  if (args && typeof args === "object" && !Array.isArray(args)) {
    const markdown = (args as { markdown?: unknown }).markdown;
    if (typeof markdown === "string" && markdown.trim().length > 0) return markdown;
  }
  return "";
}

function isStreamingStatus(status: { type?: string } | undefined): boolean {
  return status?.type === "running" || status?.type === "incomplete";
}

export function OpenDailyBriefToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<OpenDailyBriefInput, OpenDailyBriefOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const completedRef = React.useRef(false);
  const stampedRef = React.useRef(false);
  const markOpened = useMarkDailyBriefOpenedMutation();
  const rawMarkdown = parseMarkdown(args, result);
  const facts = latestDailyBriefFactsFromMessages(messages);
  const markdown = resolveDailyBriefMarkdown(rawMarkdown, facts);
  const onLatest = toolCallIsOnLatestAssistant(messages, toolCallId);
  const streaming = isStreamingStatus(status);

  const resolvedToolName = isOpenDailyBriefToolName(toolName ?? "")
    ? (toolName as string)
    : OPEN_DAILY_BRIEF_TOOL_ID;

  React.useEffect(() => {
    if (!onLatest) {
      if (result != null || completedRef.current) return;
      completedRef.current = true;
      const output = { opened: false, markdown: markdown || "" };
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
      return;
    }

    if (!markdown || isPlaceholderDailyBriefMarkdown(markdown)) return;
    const counts = latestDailyBriefCountsFromMessages(messages) ?? {
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

    if (result != null || completedRef.current) return;
    if (streaming) return;
    completedRef.current = true;
    const output = { opened: true, markdown };
    if (typeof addResult === "function") addResult(output);
    void addToolOutput({
      tool: resolvedToolName,
      toolCallId,
      output
    });
    if (!stampedRef.current) {
      stampedRef.current = true;
      markOpened.mutate({});
    }
  }, [
    addResult,
    addToolOutput,
    facts,
    markOpened,
    markdown,
    messages,
    onLatest,
    resolvedToolName,
    result,
    streaming,
    toolCallId
  ]);

  if (!markdown) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">Opening today…</p>
    );
  }

  return (
    <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
      Today is open in the side panel.
    </p>
  );
}
