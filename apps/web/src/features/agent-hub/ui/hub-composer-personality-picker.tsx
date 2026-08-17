"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";
import {
  HUB_PERSONALITIES,
  hubPersonalityAvatarSeed,
  hubPersonalityById,
  type HubPersonalityId
} from "@tsu-stack/core";
import { AgentAvatar } from "@tsu-stack/ui/components/agent-avatar";

import { ComposerMenu, ComposerMenuItem } from "@/shared/ui/composer";

import { useUpdateHubPersonalityMutation } from "@/features/agent-hub/api/update-hub-personality.mutation";
import {
  getHubComposerPersonality,
  setHubComposerPersonality
} from "@/features/agent-hub/lib/hub-composer-personality";

export function HubComposerPersonalityPicker({ disabled = false }: { disabled?: boolean }) {
  const settings = useQuery(
    orpcQueryClient.aiSettings.get.queryOptions({
      staleTime: 60_000,
      refetchOnWindowFocus: false
    })
  );
  const update = useUpdateHubPersonalityMutation();
  const settingsId = settings.data?.hubPersonality;
  const [picked, setPicked] = useState<HubPersonalityId | null>(() => getHubComposerPersonality());
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const selectedId = hubPersonalityById(picked ?? settingsId).id;
  const selected = hubPersonalityById(selectedId);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  function pick(id: HubPersonalityId) {
    const preset = hubPersonalityById(id);
    setPicked(preset.id);
    setHubComposerPersonality(preset.id);
    setOpen(false);
    update.mutate({
      hubPersonality: preset.id,
      hubAvatar: preset.defaultAvatar
    });
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label={`Assistant: ${selected.label}`}
        onClick={() => {
          setOpen((value) => !value);
        }}
        className="flex h-8 max-w-40 items-center gap-1.5 rounded-full px-1.5 text-[12.5px] text-foreground/70 outline-none hover:bg-muted/70 disabled:opacity-50"
      >
        <AgentAvatar seed={hubPersonalityAvatarSeed(selected.id)} size={22} aria-hidden />
        <span className="truncate font-medium">{selected.label}</span>
      </button>
      <ComposerMenu open={open} align="start">
        {HUB_PERSONALITIES.map((preset) => (
          <ComposerMenuItem
            key={preset.id}
            active={preset.id === selected.id}
            onClick={() => {
              pick(preset.id);
            }}
          >
            <AgentAvatar seed={hubPersonalityAvatarSeed(preset.id)} size={24} aria-hidden />
            <span className="min-w-0 flex-1 truncate text-start">
              <span className="block truncate font-medium">{preset.label}</span>
              <span className="block truncate text-[11px] text-foreground/45">
                {preset.tagline}
              </span>
            </span>
          </ComposerMenuItem>
        ))}
      </ComposerMenu>
    </div>
  );
}
