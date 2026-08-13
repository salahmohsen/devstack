"use client";

import { FileTextIcon, Loader2Icon } from "lucide-react";
import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import { Textarea } from "@tsu-stack/ui/components/textarea";

import {
  ApplicationFromJdCard,
  findPendingProposeApplicationFromJd,
  useHubChat
} from "@/features/agent-hub";

type ImportJdSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildImportMessage(jd: string): string {
  return `Import this job description and propose an application:\n\n${jd}`;
}

/**
 * Paste a job description into the shared hub thread and render the GenUI
 * propose card while the client tool is pending. Dialog (not sheet).
 */
export function ImportJdSheet({ open, onOpenChange }: ImportJdSheetProps) {
  const { sendMessage, messages, historyReady, addToolOutput, status } = useHubChat();
  const [jd, setJd] = React.useState("");
  const sendingRef = React.useRef(false);

  const isStreaming = status === "submitted" || status === "streaming";
  const pendingPropose = React.useMemo(
    () => findPendingProposeApplicationFromJd(messages),
    [messages]
  );

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPopup
        className="flex max-h-[min(90dvh,40rem)] w-full max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        bottomStickOnMobile={false}
        showCloseButton
      >
        <DialogHeader className="shrink-0 border-b px-5 py-4">
          <DialogTitle>Import from job description</DialogTitle>
          <DialogDescription>
            Paste a posting or notes. The hub agent proposes an application you can save or package
            without leaving this page.
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
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
        </div>

        <DialogFooter className="shrink-0 border-t px-5 py-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!pendingPropose ? (
            <Button type="button" disabled={!canSend} onClick={handleSend}>
              <FileTextIcon className="size-4" aria-hidden />
              Send to hub
            </Button>
          ) : null}
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}
