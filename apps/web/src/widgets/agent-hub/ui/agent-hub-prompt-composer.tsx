import { SendHorizontal, Square } from "lucide-react";
import * as React from "react";

import { Button } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";

import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea
} from "@/components/prompt-kit";

type AgentHubPromptComposerProps = {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  onStop?: () => void;
};

export function AgentHubPromptComposer({
  value,
  onValueChange,
  onSubmit,
  disabled = false,
  isStreaming = false,
  onStop
}: AgentHubPromptComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // Enter is handled by PromptInputTextarea → PromptInput.onSubmit.
  // Do NOT also submit in a custom onKeyDown — that double-fires sendMessage
  // and produces duplicate user + assistant bubbles.

  return (
    <div className="shrink-0 border-t border-border/80 bg-background/95 p-3 backdrop-blur-sm supports-backdrop-filter:bg-background/80">
      <div className="mx-auto w-full max-w-3xl">
        <PromptInput
          isLoading={isStreaming}
          value={value}
          onValueChange={onValueChange}
          onSubmit={onSubmit}
          disabled={disabled || isStreaming}
          className="rounded-2xl border border-input bg-card shadow-xs/5"
        >
          <PromptInputTextarea
            ref={textareaRef}
            placeholder={
              disabled
                ? "Waiting for approval…"
                : isStreaming
                  ? "Generating a response…"
                  : "Ask the hub anything…"
            }
            className="min-h-11 w-full resize-none border-none bg-transparent text-sm leading-relaxed"
            rows={1}
            aria-label="Message the hub"
          />
          <PromptInputActions className="justify-end gap-1.5 p-2 pt-0">
            <PromptInputAction tooltip={isStreaming ? "Stop generating" : "Send message"}>
              <Button
                type="button"
                variant={isStreaming ? "outline" : "default"}
                size="icon-sm"
                onClick={isStreaming ? onStop : onSubmit}
                disabled={isStreaming ? false : !value.trim() || disabled}
                aria-label={isStreaming ? "Stop generating" : "Send message"}
              >
                <IconMorph
                  active={isStreaming}
                  aria-hidden
                  iconA={<SendHorizontal className="size-4" />}
                  iconB={<Square className="size-3.5 fill-current" />}
                />
              </Button>
            </PromptInputAction>
          </PromptInputActions>
        </PromptInput>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Enter to send · Shift+Enter for a new line
        </p>
      </div>
    </div>
  );
}
