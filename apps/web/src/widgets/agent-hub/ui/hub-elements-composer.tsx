"use client";

import {
  AuiIf,
  ComposerPrimitive,
  unstable_defaultDirectiveFormatter,
  unstable_useMentionAdapter,
  unstable_useSlashCommandAdapter,
  useAuiState,
  type Unstable_SlashCommand
} from "@assistant-ui/react";
import { LexicalComposerInput } from "@assistant-ui/react-lexical";
import {
  BriefcaseIcon,
  CalendarIcon,
  FileTextIcon,
  FolderIcon,
  MailIcon,
  MessageSquarePlusIcon,
  SearchIcon,
  SlashIcon,
  UserIcon,
  WrenchIcon
} from "lucide-react";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  Composer,
  ComposerActions,
  ComposerBar,
  ComposerSend,
  ComposerToolbar
} from "@/shared/ui/composer";
import { ComposerTriggerPopover } from "@/shared/ui/composer-trigger-popover";

import {
  cancelOutputForHubHitl,
  HubApplicationPlantEffect,
  HubComposerDirectiveChip,
  HubComposerModelPicker,
  HubComposerPersonalityPicker,
  HUB_SLASH_COMMAND_META,
  HUB_TOOL_MENTIONS,
  lastHubHitlKind,
  useHubChat,
  waitingHubConfirmCards
} from "@/features/agent-hub";

const TRIGGER_ICON_MAP = {
  Calendar: CalendarIcon,
  FileText: FileTextIcon,
  Wrench: WrenchIcon,
  Briefcase: BriefcaseIcon,
  Mail: MailIcon,
  User: UserIcon,
  Folder: FolderIcon,
  Search: SearchIcon,
  MessageSquarePlus: MessageSquarePlusIcon
};

export function HubElementsComposer({
  placeholder,
  disabled = false
}: {
  placeholder: string;
  disabled?: boolean;
}) {
  const { startNewChat, sendMessage } = useHubChat();
  const startingNewRef = React.useRef(false);

  const slashCommands = React.useMemo(
    (): Unstable_SlashCommand[] =>
      HUB_SLASH_COMMAND_META.map((meta) => {
        return {
          id: meta.id,
          description: meta.description,
          icon: meta.icon,
          execute: () => {
            if (meta.id === "new") {
              if (startingNewRef.current) return;
              startingNewRef.current = true;
              void startNewChat()
                .then(() => {
                  toast.success("New chat started");
                })
                .catch(() => {
                  toast.error("Could not start a new chat");
                })
                .finally(() => {
                  startingNewRef.current = false;
                });
              return;
            }
            if (meta.insertText) {
              void sendMessage({ text: meta.insertText });
            }
          }
        };
      }),
    [sendMessage, startNewChat]
  );

  const slash = unstable_useSlashCommandAdapter({
    commands: slashCommands,
    removeOnExecute: true
  });

  // Default `:hub-tool[Label]{name=id}` so DirectiveText chips render in history.
  // messagesForMastraMemoryChat expands those chips to everyday insertText for the model.
  const mention = unstable_useMentionAdapter({
    items: HUB_TOOL_MENTIONS.map((item) => {
      return {
        id: item.id,
        type: "hub-tool",
        label: item.label,
        description: item.description,
        icon: item.icon
      };
    }),
    includeModelContextTools: false,
    formatter: unstable_defaultDirectiveFormatter
  });

  const inputPlaceholder = placeholder;

  return (
    <ComposerPrimitive.Unstable_TriggerPopoverRoot>
      <ComposerPrimitive.Root className="relative w-full">
        <HubApplicationPlantEffect />
        <Composer className="mx-auto w-full max-w-(--thread-max-width)">
          <ComposerBar>
            {/* Lexical so @mentions render as chips (not raw :hub-tool[…]).
                Placeholder must be absolute or it stacks and doubles the height. */}
            <LexicalComposerInput
              placeholder={inputPlaceholder}
              submitMode="enter"
              formatter={unstable_defaultDirectiveFormatter}
              directiveChip={HubComposerDirectiveChip}
              aria-label="Message input"
              aria-disabled={disabled || undefined}
              className={cn(
                "relative w-full overflow-y-auto bg-transparent px-3 py-1.5 text-[15px] caret-primary outline-none",
                // Single-line default height (match former textarea min-h-11 − padding)
                "max-h-40 min-h-0",
                "[&_.aui-lexical-input]:min-h-5.5 [&_.aui-lexical-input]:outline-none",
                "[&_.aui-lexical-input]:whitespace-pre-wrap [&_.aui-lexical-input_p]:m-0",
                // Overlay placeholder — Lexical renders it as a sibling of ContentEditable
                "[&_.aui-lexical-placeholder]:pointer-events-none [&_.aui-lexical-placeholder]:absolute",
                "[&_.aui-lexical-placeholder]:inset-x-3 [&_.aui-lexical-placeholder]:top-1.5",
                "[&_.aui-lexical-placeholder]:text-muted-foreground/70 [&_.aui-lexical-placeholder]:select-none",
                disabled && "pointer-events-none opacity-60"
              )}
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

        {!disabled ? (
          <>
            <ComposerTriggerPopover
              char="@"
              adapter={mention.adapter}
              directive={mention.directive}
              iconMap={TRIGGER_ICON_MAP}
              fallbackIcon={WrenchIcon}
              emptyItemsLabel="No matching tools"
            />
            <ComposerTriggerPopover
              char="/"
              adapter={slash.adapter}
              action={slash.action}
              iconMap={TRIGGER_ICON_MAP}
              fallbackIcon={SlashIcon}
              emptyItemsLabel="No matching commands"
            />
          </>
        ) : null}
      </ComposerPrimitive.Root>
    </ComposerPrimitive.Unstable_TriggerPopoverRoot>
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
