import {
  AuiConfig,
  defineToolkit,
  Suggestions,
  Tools,
  type ToolCallMessagePartProps
} from "@assistant-ui/react";
import * as React from "react";

import {
  ProposeApplicationFromJdInputSchema,
  type ProposeApplicationFromJdOutput
} from "@tsu-stack/core";

import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { HUB_AUI_SUGGESTIONS } from "@/features/agent-hub/api/hub-suggestions";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  isProposeApplicationFromJdToolName,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction
} from "@/features/agent-hub/lib/hub-tool-names";

import { AgentHubToolApproval } from "./agent-hub-tool-approval";
import {
  ApplicationFromJdCard,
  PROPOSE_FROM_JD_CHOICE_LABELS,
  type ApplicationFromJdCardAction
} from "./application-from-jd-card";

const PROPOSE_FROM_JD_TOOL_ID = "propose-application-from-jd";

type ProposeArgs = {
  title?: string;
  companyName?: string;
  description?: string;
  url?: string | null;
  applyUrl?: string | null;
  location?: string | null;
  matchScore?: number | null;
  notes?: string | null;
};

function ProposeApplicationFromJdToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName
}: ToolCallMessagePartProps<ProposeArgs, ProposeApplicationFromJdOutput>) {
  const { addToolOutput } = useHubChat();
  const action = parseProposeApplicationFromJdOutputAction(result);
  const input = parseProposeApplicationFromJdInput(args);
  const resolvedToolName = isProposeApplicationFromJdToolName(toolName)
    ? toolName
    : PROPOSE_FROM_JD_TOOL_ID;

  const handleSubmit = React.useCallback(
    ({ action: next }: { action: ApplicationFromJdCardAction }) => {
      const output = { action: next };
      if (typeof addResult === "function") {
        addResult(output);
        return;
      }
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  if (action) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        You chose:{" "}
        <span className="font-medium text-foreground">{PROPOSE_FROM_JD_CHOICE_LABELS[action]}</span>
      </p>
    );
  }

  return (
    <ApplicationFromJdCard
      toolCallId={toolCallId}
      input={input}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

function GenerateApplyPackageToolUI(
  props: ToolCallMessagePartProps<Record<string, unknown>, unknown>
) {
  const { args, approval, respondToApproval, toolName } = props;
  const { addToolApprovalResponse } = useHubChat();
  const [pending, setPending] = React.useState(false);

  const awaitingApproval =
    approval != null && approval.approved === undefined && approval.resolution === undefined;

  const respond = React.useCallback(
    (approved: boolean) => {
      if (pending) return;
      setPending(true);
      if (typeof respondToApproval === "function") {
        respondToApproval({ approved });
        return;
      }
      if (approval?.id) {
        void Promise.resolve(
          addToolApprovalResponse({
            id: approval.id,
            approved
          })
        ).finally(() => {
          setPending(false);
        });
        return;
      }
      setPending(false);
    },
    [addToolApprovalResponse, approval, pending, respondToApproval]
  );

  if (awaitingApproval) {
    return (
      <AgentHubToolApproval
        toolName={toolName}
        args={args ?? {}}
        onApprove={() => respond(true)}
        onDecline={() => respond(false)}
        isPending={pending}
      />
    );
  }

  return <ToolFallback {...props} />;
}

const proposeApplicationFromJdTool = {
  type: "human" as const,
  description:
    "Propose a job application parsed from a JD. Wait for user button: package | save | dismiss.",
  parameters: ProposeApplicationFromJdInputSchema,
  render: ProposeApplicationFromJdToolUI
};

const generateApplyPackageTool = {
  type: "backend" as const,
  display: "standalone" as const,
  render: GenerateApplyPackageToolUI
};

/**
 * Hub HITL tool UIs. Keys cover Mastra ids (kebab) and agent registration
 * names (camel) — `part.toolName` lookup is exact.
 */
export const hubAssistantToolkit = defineToolkit({
  "propose-application-from-jd": proposeApplicationFromJdTool,
  proposeApplicationFromJd: proposeApplicationFromJdTool,
  "generate-apply-package": generateApplyPackageTool,
  generateApplyPackage: generateApplyPackageTool
});

export const hubAssistantAuiConfig = AuiConfig({
  tools: Tools({ toolkit: hubAssistantToolkit }),
  suggestions: Suggestions(HUB_AUI_SUGGESTIONS)
});
