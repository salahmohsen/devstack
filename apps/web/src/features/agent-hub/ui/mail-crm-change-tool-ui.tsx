"use client";

import { type ToolCallMessagePartProps } from "@assistant-ui/react";
import * as React from "react";

import { orpcClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  ProposeMailCrmChangeInputSchema,
  type ProposeMailCrmChangeInput,
  type ProposeMailCrmChangeOutput
} from "@tsu-stack/core";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import { isProposeMailCrmChangeToolName } from "@/features/agent-hub/lib/hub-tool-names";

import { MailCrmChangeCard } from "./mail-crm-change-card";

const TOOL_ID = "propose-mail-crm-change";

function parseInput(value: unknown): ProposeMailCrmChangeInput | null {
  const parsed = ProposeMailCrmChangeInputSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

function parseOutput(value: unknown): ProposeMailCrmChangeOutput | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const action = (value as { action?: unknown }).action;
  if (action !== "confirm" && action !== "cancel") return null;
  const applicationId = (value as { applicationId?: unknown }).applicationId;
  return {
    action,
    applicationId: typeof applicationId === "string" ? applicationId : null
  };
}

async function applyMailCrmConfirm(input: ProposeMailCrmChangeInput): Promise<string | null> {
  if (input.intent === "close_rejected") {
    if (!input.applicationId) return null;
    await orpcClient.applications.setOutcome({
      id: input.applicationId,
      outcome: "rejected"
    });
    return input.applicationId;
  }

  if (input.intent === "create_applied") {
    const created = await orpcClient.applications.create({
      companyName: input.companyName,
      title: input.title,
      url: input.listingUrl ?? undefined,
      source: "other",
      sourceTags: ["mail", "hub"],
      stage: "applied",
      notes: input.mailSubject ?? undefined
    });
    return created.id;
  }

  if (input.intent === "track_applied") {
    if (!input.applicationId) return null;
    if (input.trackingStatus === "inbox" || input.trackingStatus === "dismissed") {
      await orpcClient.applications.promote({ id: input.applicationId });
    }
    await orpcClient.applications.updateStage({
      id: input.applicationId,
      stage: "applied"
    });
    return input.applicationId;
  }

  if (input.intent === "set_stage" && input.applicationId && input.targetStage) {
    if (input.targetStage === "applied" && input.trackingStatus !== "tracked") {
      await orpcClient.applications.promote({ id: input.applicationId });
    }
    await orpcClient.applications.updateStage({
      id: input.applicationId,
      stage: input.targetStage
    });
    return input.applicationId;
  }

  return input.applicationId ?? null;
}

export function MailCrmChangeToolUI({
  args,
  result,
  addResult,
  toolCallId,
  toolName
}: ToolCallMessagePartProps<ProposeMailCrmChangeInput, ProposeMailCrmChangeOutput>) {
  const { addToolOutput } = useHubChat();
  const input = parseInput(args);
  const completed = parseOutput(result);
  const resolvedToolName = isProposeMailCrmChangeToolName(toolName ?? "")
    ? (toolName as string)
    : TOOL_ID;

  const finish = React.useCallback(
    (output: ProposeMailCrmChangeOutput) => {
      if (typeof addResult === "function") addResult(output);
      void addToolOutput({
        tool: resolvedToolName,
        toolCallId,
        output
      });
    },
    [addResult, addToolOutput, resolvedToolName, toolCallId]
  );

  const onSubmit = React.useCallback(
    async (output: ProposeMailCrmChangeOutput) => {
      if (output.action === "cancel") {
        finish(output);
        return;
      }
      if (!input) {
        finish({ action: "cancel" });
        return;
      }
      const applicationId = await applyMailCrmConfirm(input);
      finish({ action: "confirm", applicationId });
    },
    [finish, input]
  );

  if (completed) {
    if (completed.action === "cancel") {
      return (
        <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
          Cancelled — no CRM change.
        </p>
      );
    }
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Updated from mail.
      </p>
    );
  }

  if (!input) {
    return (
      <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
        Preparing confirmation…
      </p>
    );
  }

  return (
    <MailCrmChangeCard
      toolCallId={toolCallId}
      input={input}
      onSubmit={onSubmit}
      disabled={result != null}
    />
  );
}
