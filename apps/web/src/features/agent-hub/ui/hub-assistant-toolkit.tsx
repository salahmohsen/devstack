import {
  AuiConfig,
  defineToolkit,
  Suggestions,
  Tools,
  type ToolCallMessagePartProps
} from "@assistant-ui/react";
import * as React from "react";
import { z } from "zod";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeNewJobsTriageInputSchema,
  type ProposeApplicationFromJdOutput,
  type ProposeNewJobsTriageOutput
} from "@tsu-stack/core";

import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { HUB_AUI_SUGGESTIONS } from "@/features/agent-hub/api/hub-suggestions";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  findHubApprovalId,
  withApprovalRequested
} from "@/features/agent-hub/lib/hub-approval-resume";
import { isHubApprovalPending } from "@/features/agent-hub/lib/hub-approval-summary";
import {
  isProposeApplicationFromJdToolName,
  isProposeNewJobsTriageToolName,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput
} from "@/features/agent-hub/lib/hub-tool-names";

import { AgentHubToolApproval } from "./agent-hub-tool-approval";
import {
  ApplicationFromJdCard,
  PROPOSE_FROM_JD_CHOICE_LABELS,
  type ApplicationFromJdCardAction
} from "./application-from-jd-card";
import { NewJobsTriageCard } from "./new-jobs-triage-card";
import { OpenSurfaceToolUI } from "./open-surface-tool-ui";

const PROPOSE_FROM_JD_TOOL_ID = "propose-application-from-jd";
const PROPOSE_TRIAGE_TOOL_ID = "propose-new-jobs-triage";

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
      // Prefer toolkit addResult for UI part state, then Chat.addToolOutput so
      // sendAutomaticallyWhen re-POSTs (addResult alone does not always resume).
      if (typeof addResult === "function") {
        addResult(output);
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

function ProposeNewJobsTriageToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName
}: ToolCallMessagePartProps<Record<string, unknown>, ProposeNewJobsTriageOutput>) {
  const { addToolOutput, messages } = useHubChat();
  const completed = parseProposeNewJobsTriageOutput(result);
  const input = parseProposeNewJobsTriageInput(args);
  const resolvedToolName = isProposeNewJobsTriageToolName(toolName)
    ? toolName
    : PROPOSE_TRIAGE_TOOL_ID;

  const handleSubmit = React.useCallback(
    (output: ProposeNewJobsTriageOutput) => {
      // Cancel sibling open triage cards so auto-resume is not blocked by other
      // pending client tools in the same thread (model sometimes proposes twice).
      if (output.action === "confirm") {
        for (const msg of messages) {
          if (msg.role !== "assistant") continue;
          for (const raw of msg.parts ?? []) {
            const part = raw as {
              type?: string;
              toolName?: string;
              toolCallId?: string;
              state?: string;
            };
            const type = part.type ?? "";
            const isTool = type.startsWith("tool-") || type === "dynamic-tool";
            if (!isTool) continue;
            const name =
              part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
            if (!isProposeNewJobsTriageToolName(name)) continue;
            const id = part.toolCallId ?? "";
            if (!id || id === toolCallId) continue;
            if (
              part.state !== "input-available" &&
              part.state !== "input-streaming" &&
              part.state !== "call" &&
              part.state !== "partial-call"
            ) {
              continue;
            }
            void addToolOutput({
              tool: name,
              toolCallId: id,
              output: { action: "cancel", trackIds: [], dismissIds: [] }
            });
          }
        }
      }

      if (typeof addResult === "function") {
        addResult(output);
      }
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, messages, resolvedToolName, toolCallId]
  );

  if (completed) {
    if (completed.action === "cancel") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          You cancelled triage — no track/dismiss changes.
        </p>
      );
    }
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Confirmed triage: track {completed.trackIds.length}, dismiss {completed.dismissIds.length}.
      </p>
    );
  }

  return (
    <NewJobsTriageCard
      toolCallId={toolCallId}
      input={input}
      disabled={result != null || !toolCallId}
      onSubmit={handleSubmit}
    />
  );
}

function ApprovalGatedToolUI(props: ToolCallMessagePartProps<Record<string, unknown>, unknown>) {
  const { args, approval, respondToApproval, toolName, toolCallId, status, result } = props;
  const { addToolApprovalResponse, addToolOutput, messages, setMessages } = useHubChat();
  const [pending, setPending] = React.useState(false);

  const awaitingApproval = isHubApprovalPending({ approval, status, result });

  const respond = React.useCallback(
    (approved: boolean) => {
      if (pending) return;
      setPending(true);

      const approvalId =
        (typeof approval?.id === "string" && approval.id.length > 0 ? approval.id : null) ??
        findHubApprovalId(messages, toolCallId);

      if (approvalId) {
        setMessages(
          withApprovalRequested(messages, toolCallId, approvalId) as Parameters<
            typeof setMessages
          >[0]
        );
        void Promise.resolve(addToolApprovalResponse({ id: approvalId, approved })).finally(() => {
          setPending(false);
        });
        return;
      }

      if (
        approval != null &&
        approval.approved === undefined &&
        typeof respondToApproval === "function"
      ) {
        try {
          respondToApproval({ approved });
        } finally {
          setPending(false);
        }
        return;
      }

      // Mastra sometimes persists requireToolApproval as input-available with no
      // approval id. Local output unsticks the card so the composer is not locked.
      if (toolCallId) {
        void Promise.resolve(
          addToolOutput({
            tool: toolName,
            toolCallId,
            output: { approved, localOnly: true }
          })
        ).finally(() => {
          setPending(false);
        });
        return;
      }

      setPending(false);
    },
    [
      addToolApprovalResponse,
      addToolOutput,
      approval,
      messages,
      pending,
      respondToApproval,
      setMessages,
      toolCallId,
      toolName
    ]
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

const proposeNewJobsTriageTool = {
  type: "human" as const,
  description: "Propose New jobs triage Track/Dismiss lists. Wait for Confirm or Cancel.",
  parameters: ProposeNewJobsTriageInputSchema,
  render: ProposeNewJobsTriageToolUI
};

const approvalTool = {
  type: "backend" as const,
  display: "standalone" as const,
  render: ApprovalGatedToolUI
};

const OpenSurfaceParametersSchema = z.object({
  href: z.string().min(1)
});

const openSurfaceToolEntry = {
  type: "human" as const,
  description: "Navigate the dashboard to an href under /dashboard.",
  parameters: OpenSurfaceParametersSchema,
  render: OpenSurfaceToolUI
};

/**
 * Hub HITL tool UIs. Keys cover Mastra ids (kebab) and agent registration
 * names (camel) — `part.toolName` lookup is exact.
 */
export const hubAssistantToolkit = defineToolkit({
  "propose-application-from-jd": proposeApplicationFromJdTool,
  proposeApplicationFromJd: proposeApplicationFromJdTool,
  "propose-new-jobs-triage": proposeNewJobsTriageTool,
  proposeNewJobsTriage: proposeNewJobsTriageTool,
  "generate-apply-package": approvalTool,
  generateApplyPackage: approvalTool,
  "accept-apply-package": approvalTool,
  acceptApplyPackage: approvalTool,
  "send-apply-outreach": approvalTool,
  sendApplyOutreach: approvalTool,
  "send-mail-reply": approvalTool,
  sendMailReply: approvalTool,
  "create-application": approvalTool,
  createApplication: approvalTool,
  "open-surface": openSurfaceToolEntry,
  openSurface: openSurfaceToolEntry
});

export const hubAssistantAuiConfig = AuiConfig({
  tools: Tools({ toolkit: hubAssistantToolkit }),
  suggestions: Suggestions(HUB_AUI_SUGGESTIONS)
});
