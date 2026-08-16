"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import { type GetSearchBriefOutput } from "@tsu-stack/core";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { isGetSearchBriefToolName } from "@/features/agent-hub/lib/hub-tool-names";

const GET_SEARCH_BRIEF_TOOL_ID = "get-search-brief";

const EMPTY_BRIEF: GetSearchBriefOutput = {
  markdown: null,
  hash: "",
  structured: {
    prefs: {
      workModes: [],
      locations: [],
      remoteRegions: [],
      roleKeywords: [],
      excludeKeywords: [],
      salaryMin: null,
      salaryCurrency: null,
      levelFloor: null,
      titleId: null,
      customTitle: null
    },
    profile: { name: "", summary: "" }
  },
  proseSkipped: true,
  previousMarkdown: null
};

export function GetSearchBriefToolUI({
  result,
  addResult,
  toolCallId,
  toolName,
  status
}: ToolCallMessagePartProps<Record<string, never>, GetSearchBriefOutput>) {
  const { addToolOutput } = useHubChat();
  const completedRef = React.useRef(false);

  const resolvedToolName = isGetSearchBriefToolName(toolName ?? "")
    ? (toolName as string)
    : GET_SEARCH_BRIEF_TOOL_ID;

  const complete = React.useCallback(
    (output: GetSearchBriefOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  React.useEffect(() => {
    if (result != null) return;
    if (completedRef.current) return;
    if (status?.type === "running") return;
    completedRef.current = true;
    void orpcClient.jobPreference.ensureBrief().then(complete, () => {
      complete(EMPTY_BRIEF);
    });
  }, [complete, result, status?.type]);

  return null;
}
