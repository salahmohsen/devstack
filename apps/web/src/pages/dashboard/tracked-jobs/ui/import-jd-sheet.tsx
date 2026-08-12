"use client";

import { type UIMessage } from "@ai-sdk/react";
import { FileTextIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

import { type ProposeApplicationFromJdInput } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Sheet,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetPanel,
  SheetPopup,
  SheetTitle
} from "@tsu-stack/ui/components/sheet";
import { Textarea } from "@tsu-stack/ui/components/textarea";

import { useHubChat } from "@/features/agent-hub";

import { ApplicationFromJdCard, type ApplicationFromJdCardInput } from "@/widgets/agent-hub";

type ImportJdSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type HubToolPart = {
  type: string;
  toolCallId?: string;
  toolName?: string;
  state?: string;
  input?: unknown;
  output?: unknown;
};

const PROPOSE_FROM_JD_TOOL_NAMES = new Set([
  "propose-application-from-jd",
  "proposeApplicationFromJd"
]);

function getToolName(part: HubToolPart): string {
  if (part.toolName && part.toolName.length > 0) return part.toolName;
  if (part.type === "dynamic-tool") return "tool";
  if (part.type.startsWith("tool-")) return part.type.slice("tool-".length);
  return part.type;
}

function isToolPart(part: HubToolPart): boolean {
  return part.type.startsWith("tool-") || part.type === "dynamic-tool";
}

function parseProposeInput(input: unknown): ApplicationFromJdCardInput {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { title: "", companyName: "", description: "" };
  }
  const o = input as Partial<ProposeApplicationFromJdInput>;
  return {
    title: typeof o.title === "string" ? o.title : "",
    companyName: typeof o.companyName === "string" ? o.companyName : "",
    description: typeof o.description === "string" ? o.description : "",
    url: o.url ?? null,
    applyUrl: o.applyUrl ?? null,
    location: o.location ?? null,
    matchScore: typeof o.matchScore === "number" ? o.matchScore : null,
    notes: o.notes ?? null
  };
}

type PendingPropose = {
  toolCallId: string;
  toolName: string;
  input: ApplicationFromJdCardInput;
};

/** Latest assistant propose-from-jd tool still waiting for user choice. */
function findPendingProposeFromJd(messages: UIMessage[]): PendingPropose | null {
  for (const msg of [...messages].toReversed()) {
    if (msg.role !== "assistant") continue;
    for (const raw of [...(msg.parts ?? [])].toReversed()) {
      const part = raw as HubToolPart;
      if (!isToolPart(part)) continue;
      if (!PROPOSE_FROM_JD_TOOL_NAMES.has(getToolName(part))) continue;
      if (part.state !== "input-available" && part.state !== "input-streaming") continue;
      const toolCallId = part.toolCallId ?? "";
      if (!toolCallId) continue;
      return {
        toolCallId,
        toolName: getToolName(part) || "propose-application-from-jd",
        input: parseProposeInput(part.input)
      };
    }
  }
  return null;
}

function buildImportMessage(jd: string): string {
  return `Import this job description and propose an application:\n\n${jd}`;
}

/**
 * Applications dual surface: paste a JD into the shared hub thread and
 * render the same GenUI propose card while the client tool is pending.
 */
export function ImportJdSheet({ open, onOpenChange }: ImportJdSheetProps) {
  const { sendMessage, messages, historyReady, addToolOutput, status } = useHubChat();
  const [jd, setJd] = React.useState("");
  const sendingRef = React.useRef(false);

  const isStreaming = status === "submitted" || status === "streaming";
  const pendingPropose = React.useMemo(() => findPendingProposeFromJd(messages), [messages]);

  React.useEffect(() => {
    if (!isStreaming) {
      sendingRef.current = false;
    }
  }, [isStreaming]);

  const canSend = historyReady && !isStreaming && jd.trim().length > 0 && !pendingPropose;

  const handleSend = React.useCallback(() => {
    const trimmed = jd.trim();
    if (!trimmed || !historyReady || isStreaming || sendingRef.current || pendingPropose) {
      return;
    }
    sendingRef.current = true;
    setJd("");
    void sendMessage({ text: buildImportMessage(trimmed) });
  }, [historyReady, isStreaming, jd, pendingPropose, sendMessage]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetPopup className="w-full max-w-lg sm:max-w-lg" side="right" showCloseButton>
        <SheetHeader>
          <SheetTitle>Import from job description</SheetTitle>
          <SheetDescription>
            Paste a posting or notes. The hub agent proposes an application you can save or package
            without leaving this page.
          </SheetDescription>
        </SheetHeader>

        <SheetPanel className="flex min-h-0 flex-1 flex-col gap-4">
          {pendingPropose ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Review the proposed application, then choose how to continue.
              </p>
              <ApplicationFromJdCard
                toolCallId={pendingPropose.toolCallId}
                input={pendingPropose.input}
                disabled={!addToolOutput}
                onSubmit={({ action }) => {
                  void addToolOutput({
                    tool: pendingPropose.toolName,
                    toolCallId: pendingPropose.toolCallId,
                    output: { action }
                  });
                }}
              />
              {isStreaming ? (
                <p
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                  Agent is working…
                </p>
              ) : null}
            </div>
          ) : (
            <>
              <Textarea
                value={jd}
                onChange={(e) => setJd(e.target.value)}
                placeholder="Paste the full job description here…"
                disabled={!historyReady || isStreaming}
                className="min-h-56 w-full"
                size="lg"
                aria-label="Job description"
              />
              {!historyReady ? (
                <p className="text-xs text-muted-foreground" aria-live="polite">
                  Loading hub chat…
                </p>
              ) : isStreaming ? (
                <p
                  className="inline-flex items-center gap-2 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                  Sending to hub…
                </p>
              ) : null}
            </>
          )}
        </SheetPanel>

        <SheetFooter>
          <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            {!pendingPropose ? (
              <Button type="button" disabled={!canSend} onClick={handleSend}>
                <FileTextIcon className="size-4" aria-hidden />
                Send to hub
              </Button>
            ) : null}
          </div>
        </SheetFooter>
      </SheetPopup>
    </Sheet>
  );
}
