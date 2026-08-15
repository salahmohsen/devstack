"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  ComposerMenu,
  ComposerModelItem,
  ComposerModelTrigger,
  type ComposerModel
} from "@/shared/ui/composer";

import { useConfiguredProviderModelsQueries } from "@/features/agent-hub/api/list-provider-models.query";
import {
  getHubComposerModel,
  setHubComposerModel,
  type HubComposerModelChoice
} from "@/features/agent-hub/lib/hub-composer-model";

export function HubComposerModelPicker({ disabled = false }: { disabled?: boolean }) {
  const settings = useQuery(
    orpcQueryClient.aiSettings.get.queryOptions({
      staleTime: 60_000,
      refetchOnWindowFocus: false
    })
  );
  const providers = settings.data?.providers;
  const lists = useConfiguredProviderModelsQueries(providers ?? []);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<HubComposerModelChoice | null>(() => getHubComposerModel());
  const rootRef = useRef<HTMLDivElement | null>(null);

  const settingsChoice = useMemo((): HubComposerModelChoice | null => {
    const modelId = settings.data?.models.hubChat?.trim();
    const providerId = settings.data?.modelProviderIds.hubChat?.trim();
    if (!modelId || !providerId) return null;
    return { modelId, providerId };
  }, [settings.data?.modelProviderIds.hubChat, settings.data?.models.hubChat]);

  const choice = picked ?? settingsChoice;

  const entries = useMemo(() => {
    const rows: Array<ComposerModel & { modelId: string; providerId: string }> = [];
    const ready = (providers ?? []).filter((provider) => provider.hasApiKey);
    ready.forEach((provider, index) => {
      const result = lists[index]?.data;
      for (const model of result?.models ?? []) {
        rows.push({
          name: model.label,
          meta: provider.label,
          modelId: model.id,
          providerId: provider.id
        });
      }
    });
    return rows;
  }, [lists, providers]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  const selected = entries.find(
    (row) => row.modelId === choice?.modelId && row.providerId === choice?.providerId
  );
  const triggerLabel = selected?.name ?? settings.data?.models.hubChat ?? "Model";

  if (entries.length === 0 && !settings.isLoading) {
    return (
      <span className="px-3 text-[12.5px] text-muted-foreground">
        Add a provider in Settings → AI
      </span>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <ComposerModelTrigger
        model={triggerLabel}
        open={open}
        disabled={disabled || entries.length === 0}
        onClick={() => setOpen((value) => !value)}
      />
      <ComposerMenu open={open} align="start">
        {entries.map((entry) => (
          <ComposerModelItem
            key={`${entry.providerId}:${entry.modelId}`}
            entry={{ name: entry.name, meta: entry.meta }}
            selected={entry.modelId === choice?.modelId && entry.providerId === choice?.providerId}
            onClick={() => {
              const next = { modelId: entry.modelId, providerId: entry.providerId };
              setPicked(next);
              setHubComposerModel(next);
              setOpen(false);
            }}
          />
        ))}
      </ComposerMenu>
    </div>
  );
}
