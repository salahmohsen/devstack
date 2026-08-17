"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { orpcQueryClient } from "@tsu-stack/api/client/tanstack-start/orpc";

import { ModelSelector, type ModelOption } from "@/shared/ui/model-selector";

import { useConfiguredProviderModelsQueries } from "@/features/agent-hub/api/list-provider-models.query";
import {
  getHubComposerModel,
  setHubComposerModel,
  type HubComposerModelChoice
} from "@/features/agent-hub/lib/hub-composer-model";

/** Encode provider+model so ModelSelector has a single id. */
export function encodeHubModelOptionId(choice: HubComposerModelChoice): string {
  return `${choice.providerId}\u001F${choice.modelId}`;
}

export function decodeHubModelOptionId(id: string): HubComposerModelChoice | null {
  const sep = id.indexOf("\u001F");
  if (sep <= 0) return null;
  const providerId = id.slice(0, sep);
  const modelId = id.slice(sep + 1);
  if (!providerId || !modelId) return null;
  return { providerId, modelId };
}

type HubModelOption = ModelOption & {
  providerId: string;
  modelId: string;
  providerLabel: string;
};

/**
 * Hub composer model picker — assistant-ui ModelSelector over BYO provider catalogs.
 * Selection is stored in sessionStorage and sent on chatStream as modelId+providerId.
 */
export function HubComposerModelPicker({ disabled = false }: { disabled?: boolean }) {
  const settings = useQuery(
    orpcQueryClient.aiSettings.get.queryOptions({
      staleTime: 60_000,
      refetchOnWindowFocus: false
    })
  );
  const providers = settings.data?.providers;
  const lists = useConfiguredProviderModelsQueries(providers ?? []);
  const [picked, setPicked] = useState<HubComposerModelChoice | null>(() => getHubComposerModel());

  const settingsChoice = useMemo((): HubComposerModelChoice | null => {
    const modelId = settings.data?.models.hubChat?.trim();
    const providerId = settings.data?.modelProviderIds.hubChat?.trim();
    if (!modelId || !providerId) return null;
    return { modelId, providerId };
  }, [settings.data?.modelProviderIds.hubChat, settings.data?.models.hubChat]);

  const choice = picked ?? settingsChoice;

  const models = useMemo((): HubModelOption[] => {
    const rows: HubModelOption[] = [];
    const ready = (providers ?? []).filter((provider) => provider.hasApiKey);
    ready.forEach((provider, index) => {
      const result = lists[index]?.data;
      for (const model of result?.models ?? []) {
        rows.push({
          id: encodeHubModelOptionId({ providerId: provider.id, modelId: model.id }),
          name: model.label,
          description: model.id,
          keywords: [provider.label, provider.id, model.id, model.label],
          providerId: provider.id,
          modelId: model.id,
          providerLabel: provider.label
        });
      }
    });
    return rows;
  }, [lists, providers]);

  const groups = useMemo(() => {
    const map = new Map<string, HubModelOption[]>();
    for (const model of models) {
      const list = map.get(model.providerLabel) ?? [];
      list.push(model);
      map.set(model.providerLabel, list);
    }
    return [...map.entries()];
  }, [models]);

  const value = choice ? encodeHubModelOptionId(choice) : models[0]?.id;

  if (models.length === 0 && !settings.isLoading) {
    return (
      <span className="px-3 text-[12.5px] text-muted-foreground">
        Add a provider in Settings → AI
      </span>
    );
  }

  if (models.length === 0) {
    return <span className="px-3 text-[12.5px] text-muted-foreground">Loading models…</span>;
  }

  const searchable = models.length > 8;
  const multiProvider = groups.length > 1;

  return (
    <ModelSelector.Root
      models={models}
      value={value}
      onValueChange={(nextId) => {
        const decoded = decodeHubModelOptionId(nextId);
        if (!decoded) return;
        setPicked(decoded);
        setHubComposerModel(decoded);
      }}
    >
      <ModelSelector.Trigger
        variant="ghost"
        size="sm"
        disabled={disabled}
        className="max-w-44 rounded-full text-[12.5px] text-muted-foreground hover:text-foreground"
      />
      <ModelSelector.Content searchable={searchable} className="w-80">
        {searchable ? <ModelSelector.Search placeholder="Filter models…" /> : null}
        <ModelSelector.List>
          <ModelSelector.Empty />
          {multiProvider
            ? groups.map(([heading, items]) => (
                <ModelSelector.Group key={heading} heading={heading}>
                  {items.map((model) => (
                    <ModelSelector.Item key={model.id} model={model} />
                  ))}
                </ModelSelector.Group>
              ))
            : models.map((model) => <ModelSelector.Item key={model.id} model={model} />)}
        </ModelSelector.List>
      </ModelSelector.Content>
    </ModelSelector.Root>
  );
}
