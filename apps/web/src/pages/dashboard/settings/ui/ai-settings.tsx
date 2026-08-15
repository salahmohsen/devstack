"use client";

import { useStore } from "@tanstack/react-form";
import { CheckCircle2Icon, ChevronDownIcon, UnplugIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AI_FEATURE_LABELS,
  aiProviderLabel,
  cascadeDefaultModelChange,
  defaultAiModels,
  getMastraProvider,
  isFeatureOnDefault,
  providerKindFromModelId,
  resolveProviderRowForModel,
  toMastraModelId,
  type AiFeature,
  type AiModelProviderIdsMap,
  type AiModelsMap,
  type AiProviderKind,
  type AiProviderPublic,
  type HubAvatarId,
  type HubPersonalityId,
  HUB_PERSONALITIES,
  hubPersonalityAvatarSeed
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import {
  Combobox,
  ComboboxCollection,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxGroupLabel,
  ComboboxInput,
  ComboboxItem,
  ComboboxList
} from "@tsu-stack/ui/components/combobox";
import { Form } from "@tsu-stack/ui/components/form";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useAppForm } from "@/shared/form";

import {
  AiProvidersSection,
  useGetAiSettingsQuery,
  useListProviderModelsMutation,
  useTestAiProviderMutation,
  useUpdateAiSettingsMutation,
  type AiSettingsQueryResult
} from "@/features/ai-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type DraftProvider = {
  id: string;
  kind: AiProviderKind;
  label: string;
  apiKey: string;
  hasApiKey: boolean;
  apiKeyLast4: string | null;
};

type FormState = {
  providers: DraftProvider[];
  models: AiModelsMap;
  modelProviderIds: AiModelProviderIdsMap;
  hubPersonality: HubPersonalityId;
  hubAvatar: HubAvatarId;
};

/** Combobox option for a model under a specific provider row (multipes-safe). */
type ModelOption = {
  value: string;
  modelId: string;
  providerId: string;
  label: string;
  groupLabel: string;
};

type ModelGroup = {
  value: string;
  items: ModelOption[];
};

/** Customize excludes `reply` (Default template). Includes all other features. */
const CUSTOMIZE_FEATURE_GROUPS: { title: string; features: AiFeature[] }[] = [
  { title: "Mail", features: ["classify"] },
  { title: "Portfolio", features: ["resumeImport", "stacks"] },
  { title: "Assistant", features: ["hubChat", "scorer"] },
  { title: "Apply", features: ["applyPackage"] }
];

function catalogModelsForKind(kind: string): Array<{ id: string; label: string }> {
  if (kind === "custom") return [];
  const entry = getMastraProvider(kind);
  if (!entry?.models?.length) return [];
  return entry.models.map((name) => {
    const id = toMastraModelId(kind, name);
    const label = name.includes("/") ? name.slice(name.indexOf("/") + 1) : name;
    return { id, label };
  });
}

function toDraftProviders(providers: AiProviderPublic[]): DraftProvider[] {
  return providers.map((p) => {
    return {
      id: p.id,
      kind: p.kind,
      label: p.label,
      apiKey: "",
      hasApiKey: p.hasApiKey,
      apiKeyLast4: p.apiKeyLast4
    };
  });
}

function formFromQuery(data: {
  providers: AiProviderPublic[];
  models: AiModelsMap;
  modelProviderIds?: AiModelProviderIdsMap;
  hubPersonality?: HubPersonalityId;
  hubAvatar?: HubAvatarId;
}): FormState {
  return {
    providers: toDraftProviders(data.providers),
    models: data.models,
    modelProviderIds: { ...data.modelProviderIds },
    hubPersonality: data.hubPersonality ?? "cairo",
    hubAvatar: data.hubAvatar ?? "scarab"
  };
}

function providerHasKey(p: DraftProvider): boolean {
  return Boolean(p.apiKey.trim() || (p.hasApiKey && p.id));
}

function groupModelOptions(options: ModelOption[]): ModelGroup[] {
  const map = new Map<string, ModelOption[]>();
  for (const opt of options) {
    const list = map.get(opt.groupLabel) ?? [];
    list.push(opt);
    map.set(opt.groupLabel, list);
  }
  return [...map.entries()].map(([label, items]) => {
    return { value: label, items };
  });
}

function ModelCombobox({
  modelId,
  providerId,
  options,
  onPick,
  onFreeType,
  onOpen,
  id
}: {
  modelId: string;
  providerId?: string;
  options: ModelOption[];
  onPick: (option: ModelOption) => void;
  onFreeType: (nextModelId: string) => void;
  /** Lazy-load live provider models when the list opens. */
  onOpen?: () => void;
  id?: string;
}) {
  const selectedOption = useMemo(() => {
    if (providerId) {
      const bound = options.find((o) => o.providerId === providerId && o.modelId === modelId);
      if (bound) return bound;
    }
    return options.find((o) => o.modelId === modelId) ?? null;
  }, [options, modelId, providerId]);

  const groups = useMemo(() => groupModelOptions(options), [options]);
  const useGroups = groups.length > 1;
  const comboboxValue = selectedOption?.value ?? (modelId || null);

  return (
    <Combobox
      value={comboboxValue}
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
      onValueChange={(val) => {
        if (val == null) return;
        const key = typeof val === "string" ? val : String(val);
        const option = options.find((o) => o.value === key);
        if (option) {
          onPick(option);
          return;
        }
        // Free-typed full provider/model (not a listed multipes option)
        onFreeType(key);
      }}
      items={useGroups ? groups : options}
      itemToStringLabel={(item) => {
        if (typeof item === "string") {
          const opt = options.find((o) => o.value === item);
          return opt?.modelId ?? item;
        }
        if (item && typeof item === "object" && "items" in item) {
          return (item as ModelGroup).value;
        }
        if (item && typeof item === "object" && "modelId" in item) {
          return (item as ModelOption).modelId;
        }
        return String(item ?? "");
      }}
    >
      <ComboboxInput
        id={id}
        placeholder="provider/model"
        showClear={false}
        // Free-type commits only via onValueChange when the value is not a listed option.
        // Per-keystroke onChange would race picks and wipe multipes provider bindings.
      />
      <ComboboxContent>
        <ComboboxEmpty>Type a full provider/model id.</ComboboxEmpty>
        {useGroups ? (
          <ComboboxList>
            {(group: ModelGroup) => (
              <ComboboxGroup key={group.value} items={group.items}>
                <ComboboxGroupLabel>{group.value}</ComboboxGroupLabel>
                <ComboboxCollection>
                  {(item: ModelOption) => (
                    <ComboboxItem key={item.value} value={item.value}>
                      {item.label}
                    </ComboboxItem>
                  )}
                </ComboboxCollection>
              </ComboboxGroup>
            )}
          </ComboboxList>
        ) : (
          <ComboboxList>
            {(item: ModelOption) => (
              <ComboboxItem key={item.value} value={item.value}>
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        )}
      </ComboboxContent>
    </Combobox>
  );
}

export function AiSettings() {
  const query = useGetAiSettingsQuery();

  if (query.isError) {
    return (
      <SettingsFrame title="AI" description="Could not load AI settings.">
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      </SettingsFrame>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <SettingsFrame
        title="AI"
        description="Connect providers and choose models. Keys stay on your account."
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading…
        </div>
      </SettingsFrame>
    );
  }

  return <AiSettingsForm data={query.data} />;
}

function AiSettingsForm({ data }: { data: AiSettingsQueryResult }) {
  const update = useUpdateAiSettingsMutation();
  const testProvider = useTestAiProviderMutation();
  const listProviderModels = useListProviderModelsMutation();
  const serverValues = useMemo(() => formFromQuery(data), [data]);

  const [customizeModels, setCustomizeModels] = useState(false);
  /** Force combobox on a feature that is currently “on Default”. */
  const [editingFeatures, setEditingFeatures] = useState<Partial<Record<AiFeature, boolean>>>({});
  /** Feature key currently being probed (`reply` = Default). */
  const [testingFeature, setTestingFeature] = useState<AiFeature | null>(null);
  /** Live model lists keyed by provider row id. */
  const [liveModelsByProviderId, setLiveModelsByProviderId] = useState<
    Record<string, Array<{ id: string; label: string }>>
  >({});
  const [modelsLoading, setModelsLoading] = useState(false);
  /** Fingerprint of the last successful live-models fetch. */
  const loadedListKeyRef = useRef("");
  const modelsLoadInFlightRef = useRef(false);

  const form = useAppForm({
    defaultValues: serverValues,
    onSubmit: async ({ value }) => {
      try {
        await update.mutateAsync({
          replaceProviders: true,
          providers: value.providers.map((p) => {
            return {
              id: p.id,
              kind: p.kind,
              label: p.label.trim() || aiProviderLabel(p.kind),
              apiKey: p.apiKey.trim() || undefined
            };
          }),
          models: value.models,
          modelProviderIds: value.modelProviderIds,
          hubPersonality: value.hubPersonality,
          hubAvatar: value.hubAvatar
        });
        form.reset({
          ...value,
          providers: value.providers.map((p) => {
            return {
              ...p,
              apiKey: "",
              hasApiKey: Boolean(p.hasApiKey || p.apiKey.trim()),
              apiKeyLast4: p.apiKey.trim() ? p.apiKey.trim().slice(-4) : p.apiKeyLast4
            };
          })
        });
        toast.success("AI settings saved");
      } catch {
        toast.error("Could not save AI settings");
      }
    }
  });

  useEffect(() => {
    if (form.store.state.isDirty) return;
    form.reset(serverValues);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable; re-sync only when server values change
  }, [serverValues]);

  const values = useStore(form.store, (state) => state.values);
  const isDirty = useStore(
    form.store,
    (state) =>
      JSON.stringify(state.values.models) !== JSON.stringify(serverValues.models) ||
      JSON.stringify(state.values.modelProviderIds) !==
        JSON.stringify(serverValues.modelProviderIds) ||
      state.values.hubPersonality !== serverValues.hubPersonality ||
      state.values.hubAvatar !== serverValues.hubAvatar
  );

  useEffect(() => {
    form.setFieldValue("providers", toDraftProviders(data.providers));
  }, [data.providers, form]);

  function patch(mutator: (current: FormState) => FormState) {
    const next = mutator(form.store.state.values);
    form.setFieldValue("providers", next.providers);
    form.setFieldValue("models", next.models);
    form.setFieldValue("modelProviderIds", next.modelProviderIds);
    form.setFieldValue("hubPersonality", next.hubPersonality);
    form.setFieldValue("hubAvatar", next.hubAvatar);
  }

  const discard = useCallback(() => {
    form.reset(serverValues);
  }, [form, serverValues]);

  const leaveGuard = useSettingsDirtyGuard(isDirty, { onDiscard: discard });

  /** Fingerprint of providers that can list models (id, kind, key availability). */
  const listableProvidersKey = useMemo(
    () =>
      values.providers
        .filter((p) => p.kind && p.kind !== "custom" && providerHasKey(p))
        .map((p) => {
          const keyState = p.apiKey.trim() ? `draft:${p.apiKey.trim().slice(-4)}` : "saved";
          return `${p.id}|${p.kind}|${keyState}|${p.label}`;
        })
        .join(";"),
    [values.providers]
  );

  /**
   * Lazy live list: fetch when a model combobox opens (or providers/keys change).
   * Catalog is always available as an immediate fallback in `modelOptions`.
   */
  const ensureLiveModels = useCallback(async () => {
    if (!listableProvidersKey) return;
    if (loadedListKeyRef.current === listableProvidersKey) return;
    if (modelsLoadInFlightRef.current) return;

    const eligible = values.providers.filter(
      (p) => p.kind && p.kind !== "custom" && providerHasKey(p)
    );
    if (eligible.length === 0) return;

    modelsLoadInFlightRef.current = true;
    setModelsLoading(true);
    const fingerprint = listableProvidersKey;

    try {
      const next: Record<string, Array<{ id: string; label: string }>> = {};
      let anyLive = false;
      await Promise.all(
        eligible.map(async (p) => {
          const draftKey = p.apiKey.trim();
          try {
            const result = await listProviderModels.mutateAsync({
              kind: p.kind,
              ...(draftKey ? { apiKey: draftKey } : {}),
              ...(p.id ? { providerId: p.id } : {})
            });
            if (result.source === "live" && result.models.length > 0) {
              anyLive = true;
              next[p.id] = result.models;
            } else {
              next[p.id] = result.models.length > 0 ? result.models : catalogModelsForKind(p.kind);
            }
          } catch {
            next[p.id] = catalogModelsForKind(p.kind);
          }
        })
      );
      setLiveModelsByProviderId(next);
      // Only stick the fingerprint when we got at least one live list (allow retry after failures).
      if (anyLive || eligible.every((p) => (next[p.id]?.length ?? 0) > 0)) {
        // Stick when we have models to show; still allow retry if nothing live and catalog-only
        // for kinds that support live by not setting fingerprint when all failed to live.
        const supportsLive = eligible.some(
          (p) => p.kind === "opencode-go" || p.kind === "opencode"
        );
        if (anyLive || !supportsLive) {
          loadedListKeyRef.current = fingerprint;
        }
      }
    } catch {
      // Model list load is best-effort; leave prior models until next open.
    }
    modelsLoadInFlightRef.current = false;
    setModelsLoading(false);
  }, [values.providers, listableProvidersKey, listProviderModels]);

  const modelOptions = useMemo((): ModelOption[] => {
    const options: ModelOption[] = [];
    const providers = values.providers.filter((p) => p.id);

    if (providers.length > 0) {
      for (const p of providers) {
        const models = liveModelsByProviderId[p.id] ?? catalogModelsForKind(p.kind);
        const groupLabel = p.label.trim() || aiProviderLabel(p.kind);
        for (const m of models) {
          options.push({
            value: `${p.id}::${m.id}`,
            modelId: m.id,
            providerId: p.id,
            label: m.id,
            groupLabel
          });
        }
      }
      return options;
    }

    // No providers yet — catalog fallback so free-type still has suggestions
    const kinds = ["deepseek", "openai", "anthropic", "xai", "openrouter"];
    for (const kind of kinds) {
      const groupLabel = aiProviderLabel(kind);
      for (const m of catalogModelsForKind(kind)) {
        options.push({
          value: `catalog::${m.id}`,
          modelId: m.id,
          providerId: "",
          label: m.id,
          groupLabel
        });
      }
    }
    return options;
  }, [values.providers, liveModelsByProviderId]);

  const defaultModel = values.models.reply ?? defaultAiModels().reply;
  const defaultProviderId = values.modelProviderIds.reply;

  function setDefaultFromOption(option: ModelOption) {
    patch((current) => {
      const next = cascadeDefaultModelChange({
        prevModels: current.models,
        prevBindings: current.modelProviderIds,
        nextDefaultModel: option.modelId,
        nextDefaultProviderId: option.providerId || undefined
      });
      return {
        ...current,
        models: next.models,
        modelProviderIds: next.bindings as AiModelProviderIdsMap
      };
    });
  }

  function setDefaultFreeType(modelId: string) {
    patch((current) => {
      const next = cascadeDefaultModelChange({
        prevModels: current.models,
        prevBindings: current.modelProviderIds,
        nextDefaultModel: modelId,
        nextDefaultProviderId: undefined
      });
      return {
        ...current,
        models: next.models,
        modelProviderIds: next.bindings as AiModelProviderIdsMap
      };
    });
  }

  function setFeatureFromOption(feature: AiFeature, option: ModelOption) {
    patch((current) => {
      const modelProviderIds = { ...current.modelProviderIds };
      if (option.providerId) {
        modelProviderIds[feature] = option.providerId;
      } else {
        delete modelProviderIds[feature];
      }
      return {
        ...current,
        models: { ...current.models, [feature]: option.modelId },
        modelProviderIds
      };
    });
  }

  function setFeatureFreeType(feature: AiFeature, modelId: string) {
    patch((current) => {
      // Free-type: set model; clear binding if it no longer matches model kind.
      const modelProviderIds = { ...current.modelProviderIds };
      const kind = providerKindFromModelId(modelId.trim());
      const boundId = modelProviderIds[feature]?.trim();
      const bound = boundId ? current.providers.find((p) => p.id === boundId) : undefined;
      if (!bound || !kind || bound.kind !== kind) {
        delete modelProviderIds[feature];
      }
      return {
        ...current,
        models: { ...current.models, [feature]: modelId },
        modelProviderIds
      };
    });
  }

  /**
   * Probe a concrete model. Resolve key with same orphan/kind rules as runtime.
   */
  async function handleTestModel(feature: AiFeature) {
    const current = values;

    const modelId = current.models[feature]?.trim() ?? "";
    if (!modelId.includes("/")) {
      toast.error("Pick a full model id (provider/model) before testing");
      return;
    }

    const kind = providerKindFromModelId(modelId);
    if (!kind) {
      toast.error("Could not read provider from model id");
      return;
    }

    const provider = resolveProviderRowForModel({
      modelId,
      preferredProviderId: current.modelProviderIds[feature],
      providers: current.providers,
      prefer: (p) => Boolean(p.apiKey.trim() || (p.hasApiKey && p.id))
    });

    if (!provider) {
      toast.error(`Add a ${aiProviderLabel(kind)} provider with an API key first`);
      return;
    }

    const draftKey = provider.apiKey.trim();
    if (!draftKey && !provider.hasApiKey) {
      toast.error(
        `Enter an API key for ${provider.label.trim() || aiProviderLabel(provider.kind)} before testing.`
      );
      return;
    }
    if (!draftKey && !provider.id) {
      toast.error("Save the provider first, or enter an API key to test");
      return;
    }

    setTestingFeature(feature);
    try {
      const result = await testProvider.mutateAsync({
        kind: provider.kind,
        modelId,
        ...(draftKey ? { apiKey: draftKey } : {}),
        ...(provider.id ? { providerId: provider.id } : {})
      });
      if (result.ok) {
        toast.success(result.message, {
          icon: <CheckCircle2Icon className="size-4 text-emerald-500" />
        });
      } else {
        toast.error(result.message);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not test model");
    }
    setTestingFeature(null);
  }

  function canTestFeature(feature: AiFeature): boolean {
    const modelId = values.models[feature]?.trim() ?? "";
    if (!modelId.includes("/")) return false;

    const provider = resolveProviderRowForModel({
      modelId,
      preferredProviderId: values.modelProviderIds[feature],
      providers: values.providers,
      prefer: (p) => Boolean(p.apiKey.trim() || (p.hasApiKey && p.id))
    });
    if (!provider) return false;
    return Boolean(provider.apiKey.trim() || (provider.hasApiKey && provider.id));
  }

  return (
    <>
      <SettingsFrame
        title="AI"
        description="Connect providers and choose models. Keys stay on your account."
        actions={
          <SettingsSaveBar
            dirty={isDirty}
            saving={update.isPending}
            statusKey={values}
            onSave={() => void form.handleSubmit()}
            onDiscard={discard}
            saveLabel="Save"
          />
        }
      >
        <Form
          className="space-y-8"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <SettingsSection
            title="Hub assistant"
            description="Voice and face for the dashboard chat. Each character has its own look. Cairo is the default — useful, a little cheeky, and it already knows your product words."
          >
            <form.AppField name="hubPersonality">
              {(field) => (
                <field.AvatarSelectField
                  ariaLabel="Hub assistant"
                  options={HUB_PERSONALITIES.map((preset) => {
                    return {
                      value: preset.id,
                      label: preset.label,
                      description: preset.tagline,
                      seed: hubPersonalityAvatarSeed(preset.id)
                    };
                  })}
                  onValueChange={(nextId) => {
                    const nextPreset = HUB_PERSONALITIES.find((preset) => preset.id === nextId);
                    if (nextPreset) {
                      form.setFieldValue("hubAvatar", nextPreset.defaultAvatar);
                    }
                  }}
                />
              )}
            </form.AppField>
          </SettingsSection>

          <AiProvidersSection
            providers={data.providers}
            modelProviderIds={data.modelProviderIds ?? {}}
          />

          <SettingsSection
            title="Models"
            description="Test runs a small request with this model and the matching provider key."
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <Label className="text-xs" htmlFor="ai-default-model">
                  Default model
                </Label>
                {/*
                      Model + Test share one row from sm. items-end keeps the button
                      on the input baseline (label sits above the field only).
                    */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <ModelCombobox
                      id="ai-default-model"
                      modelId={defaultModel}
                      providerId={defaultProviderId}
                      options={modelOptions}
                      onPick={setDefaultFromOption}
                      onFreeType={setDefaultFreeType}
                      onOpen={() => {
                        void ensureLiveModels();
                      }}
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="w-full shrink-0 sm:w-auto"
                    disabled={testingFeature !== null || !canTestFeature("reply")}
                    aria-label={`Test model ${defaultModel}`}
                    onClick={() => void handleTestModel("reply")}
                  >
                    {testingFeature === "reply" ? (
                      <Spinner className="size-3.5" />
                    ) : (
                      <UnplugIcon className="size-3.5" />
                    )}
                    {testingFeature === "reply" ? "Testing…" : "Test"}
                  </Button>
                </div>
                {modelsLoading ? (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Spinner className="size-3" />
                    Loading models…
                  </p>
                ) : null}
              </div>

              <Collapsible open={customizeModels} onOpenChange={setCustomizeModels}>
                <CollapsibleTrigger
                  className={cn(
                    "flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  )}
                >
                  <ChevronDownIcon
                    className={cn(
                      "size-3.5 shrink-0 transition-transform",
                      customizeModels && "rotate-180"
                    )}
                  />
                  Customize per feature
                </CollapsibleTrigger>
                <CollapsiblePanel className="mt-4 space-y-6">
                  {CUSTOMIZE_FEATURE_GROUPS.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">{group.title}</p>
                      <div
                        className={cn(
                          "grid auto-rows-[1fr] gap-3",
                          group.features.length > 1 && "sm:grid-cols-2"
                        )}
                      >
                        {group.features.map((feature) => {
                          const onDefault = isFeatureOnDefault({
                            feature,
                            models: values.models,
                            bindings: values.modelProviderIds
                          });
                          const featureModel = values.models[feature];
                          const featureProviderId = values.modelProviderIds[feature];
                          const isTesting = testingFeature === feature;
                          const forceEdit = Boolean(editingFeatures[feature]);
                          const showDefaultLabel = onDefault && !forceEdit;

                          // Shared tile shell so Default vs override align on edges/height.
                          return (
                            <div
                              key={feature}
                              className="flex h-full min-h-20 flex-col gap-2 rounded-lg border border-border/80 px-3 py-3"
                            >
                              <div className="flex min-h-5 items-center justify-between gap-2">
                                <Label className="text-xs font-medium text-foreground">
                                  {AI_FEATURE_LABELS[feature]}
                                </Label>
                                {showDefaultLabel ? (
                                  <span className="inline-flex shrink-0 items-center rounded-md border border-border/70 bg-muted/40 px-2 py-0.5 text-[11px] text-muted-foreground">
                                    Default
                                  </span>
                                ) : null}
                              </div>

                              {showDefaultLabel ? (
                                <div className="mt-auto flex items-center justify-between gap-2">
                                  <span className="truncate text-xs text-muted-foreground">
                                    Uses default model
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 shrink-0 px-2 text-xs"
                                    onClick={() =>
                                      setEditingFeatures((prev) => {
                                        return { ...prev, [feature]: true };
                                      })
                                    }
                                  >
                                    Change
                                  </Button>
                                </div>
                              ) : (
                                <div className="mt-auto flex flex-col gap-2 sm:flex-row sm:items-center">
                                  <div className="min-w-0 flex-1">
                                    <ModelCombobox
                                      modelId={featureModel}
                                      providerId={featureProviderId}
                                      options={modelOptions}
                                      onPick={(opt) => {
                                        setFeatureFromOption(feature, opt);
                                        setEditingFeatures((prev) => {
                                          return { ...prev, [feature]: false };
                                        });
                                      }}
                                      onFreeType={(next) => {
                                        setFeatureFreeType(feature, next);
                                      }}
                                      onOpen={() => {
                                        void ensureLiveModels();
                                      }}
                                    />
                                  </div>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="w-full shrink-0 sm:w-auto"
                                    disabled={testingFeature !== null || !canTestFeature(feature)}
                                    aria-label={`Test ${AI_FEATURE_LABELS[feature]} model`}
                                    onClick={() => void handleTestModel(feature)}
                                  >
                                    {isTesting ? (
                                      <Spinner className="size-3.5" />
                                    ) : (
                                      <UnplugIcon className="size-3.5" />
                                    )}
                                    {isTesting ? "Testing…" : "Test"}
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </CollapsiblePanel>
              </Collapsible>
            </div>
          </SettingsSection>
        </Form>
      </SettingsFrame>
      {leaveGuard.alertDialog}
    </>
  );
}
