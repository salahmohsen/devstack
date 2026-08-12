import {
  type ProposeApplicationFromJdInput,
  type ProposeApplicationFromJdOutput
} from "@tsu-stack/core";
import { Bubble, BubbleContent } from "@tsu-stack/ui/components/bubble";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  collapseConsecutiveTextParts,
  filterTextWhileStreaming,
  type CollapseMessagePart,
  type HubToolOutputArgs
} from "@/features/agent-hub";

import {
  Markdown,
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
  Tool,
  type ToolPart
} from "@/components/prompt-kit";

import {
  ApplicationFromJdCard,
  PROPOSE_FROM_JD_CHOICE_LABELS,
  type ApplicationFromJdCardInput
} from "./application-from-jd-card";

type MessagePart = CollapseMessagePart;

type AgentHubMessagePartsProps = {
  parts: MessagePart[];
  role: "user" | "assistant" | "system";
  /** When true, suppress completed intermediate text drafts between agent steps. */
  isStreaming?: boolean;
  /** Client-tool resume (e.g. propose-application-from-jd card). */
  addToolOutput?: (args: HubToolOutputArgs) => void | PromiseLike<void>;
};

/** Tool id and registration key variants from Mastra / AI SDK UI parts. */
const PROPOSE_FROM_JD_TOOL_NAMES = new Set([
  "propose-application-from-jd",
  "proposeApplicationFromJd"
]);

function getToolName(part: MessagePart): string {
  if (part.toolName && part.toolName.length > 0) {
    return part.toolName;
  }
  if (part.type === "dynamic-tool") {
    return "tool";
  }
  if (part.type.startsWith("tool-")) {
    return part.type.slice("tool-".length);
  }
  return part.type;
}

function isProposeApplicationFromJdTool(part: MessagePart): boolean {
  const name = getToolName(part);
  return PROPOSE_FROM_JD_TOOL_NAMES.has(name);
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

function parseProposeOutputAction(
  output: unknown
): ProposeApplicationFromJdOutput["action"] | null {
  if (!output || typeof output !== "object" || Array.isArray(output)) return null;
  const action = (output as { action?: unknown }).action;
  if (action === "package" || action === "save" || action === "dismiss") return action;
  return null;
}

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
          <p className="m-0 text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
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
      <Reasoning
        isStreaming={isStreaming}
        className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2"
      >
        <ReasoningTrigger className="text-xs text-muted-foreground">Thinking</ReasoningTrigger>
        <ReasoningContent markdown className="mt-1 text-sm">
          {text}
        </ReasoningContent>
      </Reasoning>
    </div>
  );
}

function ProposeFromJdChoiceLine({ action }: { action: ProposeApplicationFromJdOutput["action"] }) {
  return (
    <p className="w-full max-w-[min(72ch,100%)] text-xs text-muted-foreground">
      You chose:{" "}
      <span className="font-medium text-foreground">{PROPOSE_FROM_JD_CHOICE_LABELS[action]}</span>
    </p>
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

export function AgentHubMessageParts({
  parts,
  role,
  isStreaming = false,
  addToolOutput
}: AgentHubMessagePartsProps) {
  const visibleParts = filterTextWhileStreaming(
    collapseConsecutiveTextParts(parts),
    isStreaming && role === "assistant"
  );
  if (visibleParts.length === 0) return null;

  const isUser = role === "user";

  return (
    <div className="flex w-full min-w-0 flex-col gap-2.5">
      {visibleParts.map((part, i) => {
        const key = part.toolCallId
          ? `tool-${part.toolCallId}`
          : part.type === "text"
            ? `text-${i}`
            : part.type === "reasoning"
              ? `reasoning-${i}`
              : `part-${i}-${part.type}`;

        if (part.type === "text") {
          return part.text ? <TextPart key={key} text={part.text} isUser={isUser} /> : null;
        }

        if (part.type === "reasoning") {
          // AI SDK ReasoningUIPart uses `text`, not `reasoning`.
          return part.text ? (
            <ReasoningPart key={key} text={part.text} isStreaming={part.state === "streaming"} />
          ) : null;
        }

        // Hide approval-requested tool cards here — the sticky approval
        // banner owns that UX. Still show other tool states via Tool.
        if (part.type.startsWith("tool-") || part.type === "dynamic-tool") {
          if (part.state === "approval-requested") return null;

          // GenUI: propose-application-from-jd client tool
          if (isProposeApplicationFromJdTool(part)) {
            const toolName = getToolName(part);
            const toolCallId = part.toolCallId ?? "";

            if (part.state === "input-available" || part.state === "input-streaming") {
              return (
                <ApplicationFromJdCard
                  key={key}
                  toolCallId={toolCallId}
                  input={parseProposeInput(part.input)}
                  disabled={!addToolOutput || !toolCallId}
                  onSubmit={({ action }) => {
                    if (!addToolOutput || !toolCallId) return;
                    void addToolOutput({
                      tool: toolName || "propose-application-from-jd",
                      toolCallId,
                      output: { action }
                    });
                  }}
                />
              );
            }

            if (part.state === "output-available") {
              const action = parseProposeOutputAction(part.output);
              if (action) {
                return <ProposeFromJdChoiceLine key={key} action={action} />;
              }
              // Fall through to generic Tool if output shape is unexpected.
            }
          }

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
