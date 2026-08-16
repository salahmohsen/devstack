"use client";

import { AssistantModalPrimitive } from "@assistant-ui/react";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { lazy, Suspense, useState, useSyncExternalStore } from "react";

import { hubPersonalityAvatarSeed } from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";
import { Button } from "@tsu-stack/ui/components/button";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  consumeOpenHubAssistant,
  getHubAssistantOpenPending,
  subscribeHubAssistantOpen
} from "@/features/agent-hub";
import { getAiSettingsQueryOptions } from "@/features/ai-settings";

import { useSidePanel } from "@/widgets/layout";

const AgentHubThread = lazy(() =>
  import("@/widgets/agent-hub").then((m) => {
    return {
      default: m.AgentHubThread
    };
  })
);

/**
 * Official Assistant Modal floater for non-home dashboard routes.
 * Shares HubChatProvider / runtime from layout — do not mount a second provider.
 * Thread + AI settings stay unmounted until the user opens the floater.
 */
export function HubAssistantModal({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const { hasContent } = useSidePanel();
  const aiSettings = useQuery(getAiSettingsQueryOptions());
  const avatarSeed = hubPersonalityAvatarSeed(aiSettings.data?.hubPersonality);
  const pendingOpen = useSyncExternalStore(
    subscribeHubAssistantOpen,
    getHubAssistantOpenPending,
    getHubAssistantOpenPending
  );
  const visible = open || pendingOpen;

  return (
    <AssistantModalPrimitive.Root
      open={visible}
      onOpenChange={(next) => {
        if (!next) consumeOpenHubAssistant();
        setOpen(next);
      }}
    >
      <AssistantModalPrimitive.Anchor
        className={cn(
          "fixed z-40",
          hasContent
            ? "right-4 bottom-20 sm:bottom-6 xl:right-145 xl:bottom-6"
            : "right-4 bottom-20 sm:right-6 sm:bottom-6",
          className
        )}
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
          <AgentAvatar seed={avatarSeed} size={28} animated={visible} aria-hidden />
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
            <AgentAvatar seed={avatarSeed} size={20} className="me-1.5 inline-block align-middle" />
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
          {visible ? (
            <Suspense fallback={null}>
              <AgentHubThread />
            </Suspense>
          ) : null}
        </div>
      </AssistantModalPrimitive.Content>
    </AssistantModalPrimitive.Root>
  );
}
