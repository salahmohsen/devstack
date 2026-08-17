"use client";

import { AuiIf, ComposerPrimitive, useAuiState } from "@assistant-ui/react";

import { Button } from "@tsu-stack/ui/components/button";

import {
  Composer,
  ComposerActions,
  ComposerBar,
  ComposerSend,
  ComposerToolbar
} from "@/shared/ui/composer";

import {
  cancelOutputForHubHitl,
  HubComposerModelPicker,
  HubComposerPersonalityPicker,
  lastHubHitlKind,
  useHubChat,
  waitingHubConfirmCards
} from "@/features/agent-hub";

export function HubElementsComposer({
  placeholder,
  disabled = false
}: {
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <ComposerPrimitive.Root className="relative w-full">
      <Composer className="mx-auto w-full max-w-(--thread-max-width)">
        <ComposerBar>
          <ComposerPrimitive.Input
            placeholder={placeholder}
            className="min-h-11 w-full resize-none bg-transparent px-3 py-2 text-[15px] caret-primary outline-none placeholder:text-muted-foreground/70"
            rows={1}
            enterKeyHint="send"
            aria-label="Message input"
            disabled={disabled}
            addAttachmentOnPaste={false}
          />
          <ComposerToolbar>
            <ComposerActions>
              <HubClearPending />
              <HubComposerPersonalityPicker disabled={disabled} />
              <HubComposerModelPicker disabled={disabled} />
            </ComposerActions>
            <ComposerActions>
              <HubComposerSend disabled={disabled} />
            </ComposerActions>
          </ComposerToolbar>
        </ComposerBar>
      </Composer>
    </ComposerPrimitive.Root>
  );
}

function HubClearPending() {
  const { messages, addToolOutput } = useHubChat();
  const hitl = lastHubHitlKind(messages);
  if (hitl !== "client") return null;

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      className="h-7 rounded-full px-2.5 text-xs"
      onClick={() => {
        for (const card of waitingHubConfirmCards(messages)) {
          void addToolOutput({
            tool: card.toolName,
            toolCallId: card.toolCallId,
            output: cancelOutputForHubHitl(card.toolName)
          });
        }
      }}
    >
      Clear pending
    </Button>
  );
}

function HubComposerSend({ disabled }: { disabled: boolean }) {
  const isEmpty = useAuiState((state) => state.composer.isEmpty);
  const { error, status } = useHubChat();
  const hasError = status === "error" || error != null;

  return (
    <>
      <AuiIf condition={(state) => !state.thread.isRunning}>
        <ComposerPrimitive.Send
          disabled={disabled}
          render={<ComposerSend streaming={false} idle={isEmpty || disabled} error={hasError} />}
        />
      </AuiIf>
      <AuiIf condition={(state) => state.thread.isRunning}>
        <ComposerPrimitive.Cancel
          render={<ComposerSend streaming idle={false} error={hasError} />}
        />
      </AuiIf>
    </>
  );
}
