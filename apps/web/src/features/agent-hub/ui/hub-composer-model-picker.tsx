"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import {
  ComposerMenu,
  ComposerMenuLabel,
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
  const [query, setQuery] = useState("");
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

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const map = new Map<string, typeof entries>();
    for (const entry of entries) {
      if (
        needle &&
        !entry.name.toLowerCase().includes(needle) &&
        !entry.meta.toLowerCase().includes(needle) &&
        !entry.modelId.toLowerCase().includes(needle)
      ) {
        continue;
      }
      const list = map.get(entry.meta) ?? [];
      list.push(entry);
      map.set(entry.meta, list);
    }
    return [...map.entries()];
  }, [entries, query]);

  function closeMenu() {
    setOpen(false);
    setQuery("");
  }

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) closeMenu();
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

  const showFilter = entries.length > 8;
  const showGroupLabels = groups.length > 1;

  return (
    <div ref={rootRef} className="relative min-w-0">
      <ComposerModelTrigger
        model={triggerLabel}
        open={open}
        disabled={disabled || entries.length === 0}
        onClick={() => {
          if (open) closeMenu();
          else setOpen(true);
        }}
      />
      <ComposerMenu open={open} align="start">
        {showFilter ? (
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter models"
            aria-label="Filter models"
            className="sticky top-0 z-10 mb-1 w-full rounded-[10px] bg-background px-2.5 py-1.5 text-[13px] outline-none placeholder:text-foreground/35 dark:bg-popover"
          />
        ) : null}
        {groups.length === 0 ? (
          <p className="px-2.5 py-2 text-[13px] text-foreground/45">No matching models</p>
        ) : (
          groups.map(([label, items]) => (
            <div key={label}>
              {showGroupLabels ? <ComposerMenuLabel>{label}</ComposerMenuLabel> : null}
              {items.map((entry) => (
                <ComposerModelItem
                  key={`${entry.providerId}:${entry.modelId}`}
                  entry={{ name: entry.name, meta: showGroupLabels ? "" : entry.meta }}
                  selected={
                    entry.modelId === choice?.modelId && entry.providerId === choice?.providerId
                  }
                  onClick={() => {
                    const next = { modelId: entry.modelId, providerId: entry.providerId };
                    setPicked(next);
                    setHubComposerModel(next);
                    closeMenu();
                  }}
                />
              ))}
            </div>
          ))
        )}
      </ComposerMenu>
    </div>
  );
}
