"use client";

import { AssistantModalPrimitive } from "@assistant-ui/react";
import { X } from "lucide-react";

import { hubAvatarById } from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useGetAiSettingsQuery } from "@/features/ai-settings";

import { AgentHubThread } from "./agent-hub-thread";

/**
 * Official Assistant Modal floater for non-home dashboard routes.
 * Shares HubChatProvider / runtime from layout — do not mount a second provider.
 */
export function HubAssistantModal({ className }: { className?: string }) {
  const aiSettings = useGetAiSettingsQuery();
  const avatar = hubAvatarById(aiSettings.data?.hubAvatar);

  return (
    <AssistantModalPrimitive.Root>
      <AssistantModalPrimitive.Anchor
        className={cn("fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6", className)}
      >
        <AssistantModalPrimitive.Trigger
          render={
            <Button
              type="button"
              variant="outline"
              size="icon-xl"
              className="rounded-full"
              aria-label="Open hub assistant"
            />
          }
        >
          <span className="text-base leading-none" aria-hidden>
            {avatar.emoji}
          </span>
        </AssistantModalPrimitive.Trigger>
      </AssistantModalPrimitive.Anchor>
      <AssistantModalPrimitive.Content
        side="top"
        align="end"
        sideOffset={12}
        className={cn(
          "z-40 flex h-[min(36rem,calc(100dvh-6rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl sm:w-[min(26rem,calc(100vw-3rem))]"
        )}
      >
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <p className="text-sm font-medium text-foreground">
            <span className="me-1.5" aria-hidden>
              {avatar.emoji}
            </span>
            Hub assistant
          </p>
          <AssistantModalPrimitive.Trigger
            render={
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Close hub assistant"
              />
            }
          >
            <X className="size-4" aria-hidden />
          </AssistantModalPrimitive.Trigger>
        </div>
        <div className="min-h-0 flex-1">
          <AgentHubThread />
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}
