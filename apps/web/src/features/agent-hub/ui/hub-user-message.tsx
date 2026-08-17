"use client";

import { ActionBarPrimitive, MessagePrimitive } from "@assistant-ui/react";
import { PencilIcon } from "lucide-react";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Message, MessageAvatar, MessageContent } from "@tsu-stack/ui/components/message";

import { UserMessageAttachments } from "@/shared/ui/assistant-ui/attachment";
import { TooltipIconButton } from "@/shared/ui/assistant-ui/tooltip-icon-button";

function initialsFromName(name: string | null | undefined): string {
  const trimmed = name?.trim() ?? "";
  if (!trimmed) return "You";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "You";
}

export function HubUserMessage() {
  const { data: session } = authClient.useSession();
  const name = session?.user?.name ?? session?.user?.email ?? "You";
  const image = session?.user?.image ?? undefined;

  return (
    <MessagePrimitive.Root data-role="user" className="flex w-full flex-col items-end gap-2 px-2">
      <UserMessageAttachments />
      <Message align="end" className="w-auto max-w-full items-center">
        <MessageAvatar className="self-center">
          <Avatar className="size-7">
            {image ? <AvatarImage alt={name} src={image} /> : null}
            <AvatarFallback className="text-[10px] font-medium">
              {initialsFromName(name)}
            </AvatarFallback>
          </Avatar>
        </MessageAvatar>
        <MessageContent className="flex-none">
          <div className="relative min-w-0">
            <div className="peer rounded-2xl bg-muted px-3.5 py-2 text-[15px] leading-5 wrap-break-word text-foreground empty:hidden">
              <MessagePrimitive.Parts />
            </div>
            <div className="absolute inset-s-0 top-1/2 -translate-x-full -translate-y-1/2 pe-2 peer-empty:hidden rtl:translate-x-full">
              <ActionBarPrimitive.Root
                hideWhenRunning
                autohide="not-last"
                className="flex flex-col items-end"
              >
                <ActionBarPrimitive.Edit
                  render={<TooltipIconButton tooltip="Edit" className="aui-user-action-edit" />}
                >
                  <PencilIcon />
                </ActionBarPrimitive.Edit>
              </ActionBarPrimitive.Root>
            </div>
          </div>
        </MessageContent>
      </Message>
    </MessagePrimitive.Root>
  );
}
