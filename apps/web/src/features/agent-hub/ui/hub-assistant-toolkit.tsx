import {
  AuiConfig,
  defineToolkit,
  Suggestions,
  Tools,
  type ToolCallMessagePartProps
} from "@assistant-ui/react";
import { useNavigate } from "@tanstack/react-router";
import * as React from "react";
import { z } from "zod";

import {
  ProposeApplicationFromJdInputSchema,
  ProposeHardPreferenceChangeInputSchema,
  ProposeNewJobsTriageInputSchema,
  normalizeAgentTakeText,
  type ProposeApplicationFromJdOutput,
  type ProposeNewJobsTriageOutput
} from "@tsu-stack/core";

import { ToolFallback } from "@/shared/ui/assistant-ui/tool-fallback";

import { useApplicationsByTrackingQuery } from "@/features/agent-hub/api/applications-by-tracking.query";
import {
  useCreateApplicationFromJdMutation,
  useDismissApplicationFromJdMutation,
  useGenerateApplyPackageFromJdMutation
} from "@/features/agent-hub/api/create-from-jd.mutation";
import { HUB_AUI_SUGGESTIONS } from "@/features/agent-hub/api/hub-suggestions";
import { usePreviewListingTakeQuery } from "@/features/agent-hub/api/preview-listing-take.query";
import { usePreviewListingQuery } from "@/features/agent-hub/api/preview-listing.query";
import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  createInputFromJdProposal,
  inferJdCardActionFromCrm,
  jdProposalOutput,
  mergeJdProposalWithListingPreview,
  shouldGenerateJdProposalTake
} from "@/features/agent-hub/lib/complete-jd-proposal";
import {
  findHubApprovalId,
  withApprovalRequested
} from "@/features/agent-hub/lib/hub-approval-resume";
import { isHubApprovalPending } from "@/features/agent-hub/lib/hub-approval-summary";
import { requestOpenHubAssistant } from "@/features/agent-hub/lib/hub-assistant-open";
import {
  findPendingProposeApplicationFromJd,
  isProposeApplicationFromJdToolName,
  isProposeNewJobsTriageToolName,
  jdListingKey,
  listingHasResolvedJdProposal,
  parseProposeApplicationFromJdInput,
  parseProposeApplicationFromJdOutputAction,
  parseProposeNewJobsTriageInput,
  parseProposeNewJobsTriageOutput
} from "@/features/agent-hub/lib/hub-tool-names";
import {
  recalledJdCardAction,
  rememberJdCardAction
} from "@/features/agent-hub/lib/jd-card-action-memory";

import { AgentHubToolApproval } from "./agent-hub-tool-approval";
import {
  ApplicationFromJdCard,
  type ApplicationFromJdCardAction
} from "./application-from-jd-card";
import { GetExperienceToolUI, ListExperiencesToolUI } from "./experiences-timeline-tool-ui";
import { FindJobsNowToolUI } from "./find-jobs-now-tool-ui";
import { GetSearchBriefToolUI } from "./get-search-brief-tool-ui";
import { HardPreferenceChangeToolUI } from "./hard-preference-change-tool-ui";
import { JobListingPreludeStatus } from "./job-listing-prelude-status";
import { NewJobsTriageCard } from "./new-jobs-triage-card";
import { OpenSurfaceToolUI } from "./open-surface-tool-ui";
import { UpsertSoftJobPreferencesToolUI } from "./upsert-soft-job-preferences-tool-ui";

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
  const { addToolOutput, messages } = useHubChat();
  const navigate = useNavigate();
  const createApplication = useCreateApplicationFromJdMutation();
  const dismissApplication = useDismissApplicationFromJdMutation();
  const generatePackage = useGenerateApplyPackageFromJdMutation();
  const dismissedList = useApplicationsByTrackingQuery("dismissed");
  const [localAction, setLocalAction] = React.useState<ApplicationFromJdCardAction | null>(null);
  const parsedInput = parseProposeApplicationFromJdInput(args);
  const listingHref = parsedInput.url ?? parsedInput.applyUrl ?? null;
  const listingPreview = usePreviewListingQuery(listingHref);
  const mergedInput = mergeJdProposalWithListingPreview(parsedInput, listingPreview.data);
  const takeQuery = usePreviewListingTakeQuery(
    mergedInput,
    !listingPreview.isLoading && shouldGenerateJdProposalTake(mergedInput)
  );
  const generatedTake =
    takeQuery.data?.ok === true ? normalizeAgentTakeText(takeQuery.data.text ?? "") : "";
  const input = React.useMemo(
    () =>
      generatedTake && generatedTake.length > 0
        ? { ...mergedInput, notes: generatedTake }
        : mergedInput,
    [generatedTake, mergedInput]
  );
  const listingKey = jdListingKey(input);
  const action =
    parseProposeApplicationFromJdOutputAction(result) ??
    localAction ??
    recalledJdCardAction(toolCallId) ??
    inferJdCardActionFromCrm(input, {
      dismissed: listingHasResolvedJdProposal(messages, listingKey ?? "", toolCallId)
        ? dismissedList.data
        : undefined
    });
  const resolvedToolName = isProposeApplicationFromJdToolName(toolName)
    ? toolName
    : PROPOSE_FROM_JD_TOOL_ID;
  const resolvedElsewhere = Boolean(
    listingKey && listingHasResolvedJdProposal(messages, listingKey, toolCallId)
  );
  const latestPending = findPendingProposeApplicationFromJd(messages);
  const superseded = Boolean(latestPending && latestPending.toolCallId !== toolCallId);
  const outputAction = parseProposeApplicationFromJdOutputAction(result);

  const dismissSiblingProposals = React.useCallback(() => {
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
        const name = part.toolName ?? (type.startsWith("tool-") ? type.slice("tool-".length) : "");
        if (!isProposeApplicationFromJdToolName(name)) continue;
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
          output: { action: "dismiss" }
        });
      }
    }
  }, [addToolOutput, messages, toolCallId]);

  const completeProposal = React.useCallback(
    (output: ProposeApplicationFromJdOutput) => {
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

  const flushedRef = React.useRef(false);
  React.useEffect(() => {
    if (flushedRef.current || !toolCallId) return;
    if (outputAction) {
      if (outputAction === "package" || outputAction === "save" || outputAction === "dismiss") {
        dismissSiblingProposals();
      }
      return;
    }
    if (resolvedElsewhere || superseded) {
      flushedRef.current = true;
      rememberJdCardAction(toolCallId, "dismiss");
      completeProposal(jdProposalOutput("dismiss"));
      return;
    }
    if (action != null) {
      flushedRef.current = true;
      completeProposal(jdProposalOutput(action));
      dismissSiblingProposals();
    }
  }, [
    action,
    completeProposal,
    dismissSiblingProposals,
    outputAction,
    resolvedElsewhere,
    superseded,
    toolCallId
  ]);

  const handleSubmit = React.useCallback(
    async ({ action: next }: { action: ApplicationFromJdCardAction }) => {
      flushedRef.current = true;
      dismissSiblingProposals();
      if (next === "dismiss") {
        // Close the card first so Dismiss cannot sit on a spinner while CRM runs.
        setLocalAction("dismiss");
        rememberJdCardAction(toolCallId, "dismiss");
        completeProposal(jdProposalOutput("dismiss"));
        try {
          await dismissApplication.mutateAsync(createInputFromJdProposal(input));
        } catch {
          // Toast already fired; receipt stays so the button is not stuck.
        }
        return;
      }

      const created = await createApplication.mutateAsync(createInputFromJdProposal(input));
      if (next === "package") {
        try {
          await generatePackage.mutateAsync({ applicationId: created.id });
        } catch {
          // Job is tracked; package can be retried from the side panel.
        }
      }

      setLocalAction(next);
      rememberJdCardAction(toolCallId, next);
      completeProposal(jdProposalOutput(next, created.id));
      requestOpenHubAssistant();
      await navigate({
        to: "/dashboard/tracked-jobs",
        search: { applicationId: created.id }
      });
    },
    [
      completeProposal,
      createApplication,
      dismissApplication,
      dismissSiblingProposals,
      generatePackage,
      input,
      navigate,
      toolCallId
    ]
  );

  if (resolvedElsewhere) {
    return null;
  }

  return (
    <ApplicationFromJdCard
      toolCallId={toolCallId}
      input={input}
      completedAction={action}
      disabled={action != null || !toolCallId || superseded}
      superseded={superseded && action == null}
      takePending={takeQuery.isFetching && !input.notes?.trim()}
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
        } catch {
          // Approval runtime throws when the part has no approval id.
        }
        setPending(false);
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

const jobListingPreludeTool = {
  type: "backend" as const,
  display: "standalone" as const,
  render: JobListingPreludeStatus
};

const listExperiencesToolEntry = {
  type: "backend" as const,
  display: "standalone" as const,
  render: ListExperiencesToolUI
};

const proposeHardPreferenceChangeTool = {
  type: "human" as const,
  description:
    "Propose a hard-stop preference change. Wait for Confirm/Cancel. The card writes on confirm.",
  parameters: ProposeHardPreferenceChangeInputSchema,
  render: HardPreferenceChangeToolUI
};

const EmptyToolArgsSchema = z.object({});

const findJobsNowToolEntry = {
  type: "human" as const,
  description: "Enqueue Find jobs now. Completes with enqueued/seats/reason.",
  parameters: EmptyToolArgsSchema,
  render: FindJobsNowToolUI
};

const getSearchBriefToolEntry = {
  type: "human" as const,
  description: "Load the search brief via ensureBrief.",
  parameters: EmptyToolArgsSchema,
  render: GetSearchBriefToolUI
};

const upsertSoftJobPreferencesToolEntry = {
  type: "backend" as const,
  display: "standalone" as const,
  render: UpsertSoftJobPreferencesToolUI
};

const getExperienceToolEntry = {
  type: "backend" as const,
  display: "standalone" as const,
  render: GetExperienceToolUI
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
  openSurface: openSurfaceToolEntry,
  "propose-hard-preference-change": proposeHardPreferenceChangeTool,
  proposeHardPreferenceChange: proposeHardPreferenceChangeTool,
  "find-jobs-now": findJobsNowToolEntry,
  findJobsNow: findJobsNowToolEntry,
  "get-search-brief": getSearchBriefToolEntry,
  getSearchBrief: getSearchBriefToolEntry,
  "upsert-soft-job-preferences": upsertSoftJobPreferencesToolEntry,
  upsertSoftJobPreferences: upsertSoftJobPreferencesToolEntry,
  "agent-jobPageExtractor": jobListingPreludeTool,
  jobPageExtractor: jobListingPreludeTool,
  "agent-job-page-extractor": jobListingPreludeTool,
  "job-page-extractor": jobListingPreludeTool,
  "fetch-job-page": jobListingPreludeTool,
  fetchJobPage: jobListingPreludeTool,
  "list-experiences": listExperiencesToolEntry,
  listExperiences: listExperiencesToolEntry,
  "get-experience": getExperienceToolEntry,
  getExperience: getExperienceToolEntry
});

export const hubAssistantAuiConfig = AuiConfig({
  tools: Tools({ toolkit: hubAssistantToolkit }),
  suggestions: Suggestions(HUB_AUI_SUGGESTIONS)
});
