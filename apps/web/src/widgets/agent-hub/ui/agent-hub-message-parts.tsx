import { Bubble, BubbleContent } from "@tsu-stack/ui/components/bubble";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  Markdown,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Tool,
  type ToolPart
} from "@/components/prompt-kit";

type MessagePart = {
  type: string;
  text?: string;
  toolCallId?: string;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  state?: string;
  approval?: { id: string };
};

type AgentHubMessagePartsProps = {
  parts: MessagePart[];
  role: "user" | "assistant" | "system";
};

function TextPart({ text, isUser }: { text: string; isUser: boolean }) {
  return (
    <Bubble
      variant={isUser ? "default" : "muted"}
      align={isUser ? "end" : "start"}
      className="max-w-[min(80%,72ch)]"
    >
      <BubbleContent
        className={cn(
          "max-w-none",
          // User bubble is on primary — flip to primary-foreground.
          // Assistant uses themed Markdown (text-foreground / muted / primary).
          isUser ? "text-primary-foreground" : "text-foreground"
        )}
      >
        {isUser ? (
          <p className="m-0 whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
        ) : (
          <Markdown>{text}</Markdown>
        )}
      </BubbleContent>
    </Bubble>
  );
}

function ReasoningPart({ text, isStreaming }: { text: string; isStreaming?: boolean }) {
  return (
    <div className="w-full max-w-[min(72ch,100%)]">
      <Reasoning isStreaming={isStreaming} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
        <ReasoningTrigger className="text-xs text-muted-foreground">Thinking</ReasoningTrigger>
        <ReasoningContent markdown className="mt-1 text-sm">
          {text}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
}

function toToolPart(part: MessagePart): ToolPart {
  const state = (part.state ?? "input-available") as ToolPart["state"];
  return {
    type: part.toolName ?? part.type.replace(/^tool-/, ""),
    state:
      state === "input-streaming" ||
      state === "input-available" ||
      state === "output-available" ||
      state === "output-error"
        ? state
        : "input-available",
    input:
      part.input && typeof part.input === "object" && !Array.isArray(part.input)
        ? (part.input as Record<string, unknown>)
        : undefined,
    output:
      part.output && typeof part.output === "object" && !Array.isArray(part.output)
        ? (part.output as Record<string, unknown>)
        : part.output !== undefined
          ? { value: part.output }
          : undefined,
    toolCallId: part.toolCallId,
    errorText: part.errorText
  };
}

export function AgentHubMessageParts({ parts, role }: AgentHubMessagePartsProps) {
  if (parts.length === 0) return null;

  const isUser = role === "user";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {parts.map((part, i) => {
        const key = `part-${i}-${part.type}`;

        if (part.type === "text") {
          return part.text ? <TextPart key={key} text={part.text} isUser={isUser} /> : null;
        }

        if (part.type === "reasoning") {
          // AI SDK ReasoningUIPart uses `text`, not `reasoning`.
          return part.text ? (
            <ReasoningPart
              key={key}
              text={part.text}
              isStreaming={part.state === "streaming"}
            />
          ) : null;
        }

        // Hide approval-requested tool cards here — the sticky approval
        // banner owns that UX. Still show other tool states via Tool.
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          if (part.state === "approval-requested") return null;
          return (
            <div key={key} className="w-full max-w-[min(72ch,100%)]">
              <Tool toolPart={toToolPart(part)} defaultOpen={part.state === "output-error"} />
            </div>
          );
        }

        return null;
      })}
    </div>
  );
}
