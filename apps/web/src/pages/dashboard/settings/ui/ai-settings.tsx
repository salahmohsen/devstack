"use client";

import { Link } from "@tanstack/react-router";
import {
  CheckCircle2Icon,
  ChevronDownIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  UnplugIcon
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  AI_FEATURE_LABELS,
  AI_FEATURES,
  AI_PROVIDER_FEATURED,
  aiProviderLabel,
  cascadeDefaultModelChange,
  defaultAiModels,
  getMastraProvider,
  isFeatureOnDefault,
  MAIL_REPLY_AUTONOMY,
  MAIL_REPLY_AUTONOMY_LABELS,
  MASTRA_PROVIDER_CATALOG,
  providerKindFromModelId,
  resolveProviderRowForModel,
  toMastraModelId,
  type AiFeature,
  type AiModelProviderIdsMap,
  type AiModelsMap,
  type AiProviderKind,
  type AiProviderPublic,
  type MailReplyAutonomy
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
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { SecretInput } from "@tsu-stack/ui/components/secret-input";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

import {
  useGetAiSettingsQuery,
  useListProviderModelsMutation,
  useTestAiProviderMutation,
  useUpdateAiSettingsMutation
} from "@/features/ai-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type ProviderOption = { value: string; label: string };

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
  autonomy: MailReplyAutonomy;
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

const FEATURED_SET = new Set<string>(AI_PROVIDER_FEATURED);

const PROVIDER_OPTIONS: ProviderOption[] = (() => {
  const featured = AI_PROVIDER_FEATURED.map((id) => {
    return {
      value: id,
      label: `${aiProviderLabel(id)} (${id})`
    };
  });
  const rest = MASTRA_PROVIDER_CATALOG.filter((p) => !FEATURED_SET.has(p.id)).map((p) => {
    return {
      value: p.id,
      label: `${p.name} (${p.id})`
    };
  });
  return [...featured, ...rest];
})();

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
  mailReplyAutonomy: MailReplyAutonomy;
}): FormState {
  return {
    providers: toDraftProviders(data.providers),
    models: data.models,
    modelProviderIds: { ...data.modelProviderIds },
    autonomy: data.mailReplyAutonomy
  };
}

function modelsEqual(a: AiModelsMap, b: AiModelsMap): boolean {
  return AI_FEATURES.every((f) => a[f] === b[f]);
}

function bindingsEqual(a: AiModelProviderIdsMap, b: AiModelProviderIdsMap): boolean {
  return AI_FEATURES.every((f) => (a[f] ?? undefined) === (b[f] ?? undefined));
}

function providersDirty(draft: DraftProvider[], server: AiProviderPublic[]): boolean {
  if (draft.length !== server.length) return true;
  return draft.some((p, i) => {
    const s = server[i];
    if (!s) return true;
    if (p.apiKey.trim()) return true;
    return p.id !== s.id || p.kind !== s.kind || p.label !== s.label;
  });
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
  const update = useUpdateAiSettingsMutation();
  const testProvider = useTestAiProviderMutation();
  const listProviderModels = useListProviderModelsMutation();

  const [draft, setDraft] = useState<FormState | null>(null);
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

  // Keep an open draft across refetches / tab focus. Only re-sync from the
  // server when there is no local draft (initial load or after save/discard).
  const form = useMemo(() => {
    if (!query.data) return null;
    if (draft) return draft;
    return formFromQuery(query.data);
  }, [query.data, draft]);

  const serverSnapshot = useMemo(() => {
    if (!query.data) return null;
    return formFromQuery(query.data);
  }, [query.data]);

  const dirty = useMemo(() => {
    if (!form || !serverSnapshot || !query.data) return false;
    if (form.autonomy !== serverSnapshot.autonomy) return true;
    if (!modelsEqual(form.models, serverSnapshot.models)) return true;
    if (!bindingsEqual(form.modelProviderIds, serverSnapshot.modelProviderIds)) return true;
    return providersDirty(form.providers, query.data.providers);
  }, [form, serverSnapshot, query.data]);

  function ensureDraft(): FormState | null {
    if (!query.data) return null;
    if (draft) return draft;
    const next = formFromQuery(query.data);
    setDraft(next);
    return next;
  }

  function patch(mutator: (current: FormState) => FormState) {
    const base = ensureDraft();
    if (!base) return;
    setDraft(mutator(base));
  }

  function discard() {
    setDraft(null);
  }

  const leaveGuard = useSettingsDirtyGuard(dirty, { onDiscard: discard });

  /** Fingerprint of providers that can list models (id, kind, key availability). */
  const listableProvidersKey = useMemo(() => {
    if (!form) return "";
    return form.providers
      .filter((p) => p.kind && p.kind !== "custom" && providerHasKey(p))
      .map((p) => {
        const keyState = p.apiKey.trim() ? `draft:${p.apiKey.trim().slice(-4)}` : "saved";
        return `${p.id}|${p.kind}|${keyState}|${p.label}`;
      })
      .join(";");
  }, [form]);

  /**
   * Lazy live list: fetch when a model combobox opens (or providers/keys change).
   * Catalog is always available as an immediate fallback in `modelOptions`.
   */
  const ensureLiveModels = useCallback(async () => {
    if (!form || !listableProvidersKey) return;
    if (loadedListKeyRef.current === listableProvidersKey) return;
    if (modelsLoadInFlightRef.current) return;

    const eligible = form.providers.filter(
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
    } finally {
      modelsLoadInFlightRef.current = false;
      setModelsLoading(false);
    }
  }, [form, listableProvidersKey, listProviderModels]);

  const modelOptions = useMemo((): ModelOption[] => {
    if (!form) return [];
    const options: ModelOption[] = [];
    const providers = form.providers.filter((p) => p.id);

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
  }, [form, liveModelsByProviderId]);

  const defaultModel = form?.models.reply ?? defaultAiModels().reply;
  const defaultProviderId = form?.modelProviderIds.reply;

  async function handleSave() {
    const current = form;
    if (!current) return;
    try {
      await update.mutateAsync({
        replaceProviders: true,
        providers: current.providers.map((p) => {
          return {
            id: p.id,
            kind: p.kind,
            label: p.label.trim() || aiProviderLabel(p.kind),
            apiKey: p.apiKey.trim() || undefined
          };
        }),
        models: current.models,
        modelProviderIds: current.modelProviderIds,
        mailReplyAutonomy: current.autonomy
      });
      toast.success("AI settings saved");
      setDraft(null);
    } catch {
      toast.error("Could not save AI settings");
    }
  }

  function addProvider() {
    patch((current) => {
      return {
        ...current,
        providers: [
          ...current.providers,
          {
            id: crypto.randomUUID(),
            kind: "deepseek",
            label: aiProviderLabel("deepseek"),
            apiKey: "",
            hasApiKey: false,
            apiKeyLast4: null
          }
        ]
      };
    });
  }

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
    const current = form;
    if (!current) return;

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
    } finally {
      setTestingFeature(null);
    }
  }

  function canTestFeature(feature: AiFeature): boolean {
    if (!form) return false;
    const modelId = form.models[feature]?.trim() ?? "";
    if (!modelId.includes("/")) return false;

    const provider = resolveProviderRowForModel({
      modelId,
      preferredProviderId: form.modelProviderIds[feature],
      providers: form.providers,
      prefer: (p) => Boolean(p.apiKey.trim() || (p.hasApiKey && p.id))
    });
    if (!provider) return false;
    return Boolean(provider.apiKey.trim() || (provider.hasApiKey && provider.id));
  }

  if (query.isError) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle>AI</FrameTitle>
          <FrameDescription>Could not load AI settings.</FrameDescription>
        </FrameHeader>
        <FramePanel>
          <Alert variant="error">
            <AlertTitle>Failed to load</AlertTitle>
            <AlertDescription>Refresh the page or try again later.</AlertDescription>
          </Alert>
        </FramePanel>
      </Frame>
    );
  }

  const isBusy = query.isLoading || !form;

  return (
    <>
      <Frame>
        <FrameHeader>
          <FrameTitle>AI</FrameTitle>
          <FrameDescription>
            Connect providers and choose models. Keys stay on your account.
          </FrameDescription>
        </FrameHeader>

        <FramePanel className="space-y-8">
          {isBusy || !form ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              Loading…
            </div>
          ) : (
            <>
              <SettingsSection
                title="Providers"
                description="API keys for models you run. Saved keys are stored encrypted; only the last four characters are shown."
                action={
                  form.providers.length > 0 ? (
                    <Button type="button" size="sm" variant="outline" onClick={addProvider}>
                      <PlusIcon className="size-3.5" />
                      Add provider
                    </Button>
                  ) : null
                }
              >
                {form.providers.length === 0 ? (
                  <Empty className="rounded-xl border border-dashed py-10 md:py-12">
                    <EmptyHeader>
                      <EmptyMedia variant="icon">
                        <SparklesIcon />
                      </EmptyMedia>
                      <EmptyTitle>No providers yet</EmptyTitle>
                      <EmptyDescription>
                        Add a provider with an API key to run Hub, mail, and packages.
                      </EmptyDescription>
                    </EmptyHeader>
                    <EmptyContent>
                      <Button type="button" size="sm" onClick={addProvider}>
                        <PlusIcon className="size-3.5" />
                        Add provider
                      </Button>
                    </EmptyContent>
                  </Empty>
                ) : (
                  <ul className="space-y-3">
                    {form.providers.map((p, index) => (
                      <li
                        key={p.id}
                        className="relative space-y-3 rounded-xl border border-border/80 p-3 pe-12"
                      >
                        <Button
                          type="button"
                          size="icon-sm"
                          variant="ghost"
                          className="absolute inset-e-2 top-2 text-muted-foreground hover:text-destructive"
                          aria-label="Remove provider"
                          onClick={() =>
                            patch((current) => {
                              return {
                                ...current,
                                providers: current.providers.filter((_, i) => i !== index)
                              };
                            })
                          }
                        >
                          <Trash2Icon className="size-3.5" />
                        </Button>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-end">
                          <div className="space-y-1">
                            <Label className="text-xs">Provider</Label>
                            <Combobox
                              value={p.kind || null}
                              onValueChange={(val) => {
                                if (!val) return;
                                const kind = val as AiProviderKind;
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.map((row, i) =>
                                      i === index
                                        ? { ...row, kind, label: aiProviderLabel(kind) }
                                        : row
                                    )
                                  };
                                });
                              }}
                              items={PROVIDER_OPTIONS}
                              itemToStringLabel={(item) => {
                                if (typeof item === "string") {
                                  return (
                                    PROVIDER_OPTIONS.find((o) => o.value === item)?.label ?? item
                                  );
                                }
                                if (item && typeof item === "object" && "label" in item) {
                                  return String((item as ProviderOption).label);
                                }
                                return String(item ?? "");
                              }}
                            >
                              <ComboboxInput placeholder="Search providers…" showClear={false} />
                              <ComboboxContent>
                                <ComboboxEmpty>No provider found.</ComboboxEmpty>
                                <ComboboxList>
                                  {(item: ProviderOption) => (
                                    <ComboboxItem key={item.value} value={item.value}>
                                      {item.label}
                                    </ComboboxItem>
                                  )}
                                </ComboboxList>
                              </ComboboxContent>
                            </Combobox>
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Label</Label>
                            <Input
                              value={p.label}
                              onChange={(e) =>
                                patch((current) => {
                                  return {
                                    ...current,
                                    providers: current.providers.map((row, i) =>
                                      i === index ? { ...row, label: e.target.value } : row
                                    )
                                  };
                                })
                              }
                              placeholder="Display name"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs" htmlFor={`ai-provider-key-${p.id}`}>
                            API key
                          </Label>
                          <SecretInput
                            id={`ai-provider-key-${p.id}`}
                            value={p.apiKey}
                            hasSavedSecret={p.hasApiKey}
                            savedLast4={p.apiKeyLast4}
                            placeholder={p.hasApiKey ? "Leave blank to keep" : "API key"}
                            onChange={(next) =>
                              patch((current) => {
                                return {
                                  ...current,
                                  providers: current.providers.map((row, i) =>
                                    i === index ? { ...row, apiKey: next } : row
                                  )
                                };
                              })
                            }
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </SettingsSection>

              <SettingsSection
                title="Models"
                description="Test runs a small request with this model and the matching provider key."
              >
                <div className="space-y-1">
                  <Label className="text-xs" htmlFor="ai-default-model">
                    Default model
                  </Label>
                  <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
                      className="w-full shrink-0 lg:w-auto"
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
                        "size-3.5 transition-transform",
                        customizeModels && "rotate-180"
                      )}
                    />
                    Customize per feature
                  </CollapsibleTrigger>
                  <CollapsiblePanel className="mt-3 space-y-5">
                    {CUSTOMIZE_FEATURE_GROUPS.map((group) => (
                      <div key={group.title} className="space-y-2.5">
                        <p className="text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
                          {group.title}
                        </p>
                        <div className="grid gap-3 md:grid-cols-2">
                          {group.features.map((feature) => {
                            const onDefault = isFeatureOnDefault({
                              feature,
                              models: form.models,
                              bindings: form.modelProviderIds
                            });
                            const featureModel = form.models[feature];
                            const featureProviderId = form.modelProviderIds[feature];
                            const isTesting = testingFeature === feature;
                            const forceEdit = Boolean(editingFeatures[feature]);
                            const showDefaultLabel = onDefault && !forceEdit;

                            if (showDefaultLabel) {
                              return (
                                <div
                                  key={feature}
                                  className="flex min-h-18 flex-col justify-center gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5"
                                >
                                  <Label className="text-xs font-medium text-foreground">
                                    {AI_FEATURE_LABELS[feature]}
                                  </Label>
                                  <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center rounded-md border border-border/70 bg-background/80 px-2 py-0.5 text-xs text-muted-foreground">
                                      Default
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 px-2 text-xs"
                                      onClick={() =>
                                        setEditingFeatures((prev) => {
                                          return { ...prev, [feature]: true };
                                        })
                                      }
                                    >
                                      Change
                                    </Button>
                                  </div>
                                </div>
                              );
                            }

                            return (
                              <div
                                key={feature}
                                className="flex min-h-18 flex-col gap-2 rounded-lg border border-border/80 bg-background/40 px-3 py-2.5"
                              >
                                <Label className="text-xs font-medium text-foreground">
                                  {AI_FEATURE_LABELS[feature]}
                                </Label>
                                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
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
                                  {!onDefault ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="w-full shrink-0 lg:w-auto"
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
                                  ) : null}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </CollapsiblePanel>
                </Collapsible>
              </SettingsSection>

              <SettingsSection
                title="Mail reply autonomy"
                description="Assist always generates a draft and waits for confirm in Review. Full auto-sends after generation when job context is present."
              >
                <Select
                  value={form.autonomy}
                  onValueChange={(value) => {
                    if (!value) return;
                    patch((current) => {
                      return {
                        ...current,
                        autonomy: value as MailReplyAutonomy
                      };
                    });
                  }}
                  itemToStringLabel={(value) =>
                    MAIL_REPLY_AUTONOMY_LABELS[value as MailReplyAutonomy] ?? String(value)
                  }
                >
                  <SelectTrigger className="max-w-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectPopup>
                    <SelectList>
                      {MAIL_REPLY_AUTONOMY.map((value) => (
                        <SelectItem key={value} value={value}>
                          {MAIL_REPLY_AUTONOMY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectList>
                  </SelectPopup>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Where alerts go:{" "}
                  <Link
                    to="/dashboard/settings/notifications"
                    className="font-medium text-foreground underline-offset-2 hover:underline"
                  >
                    Notifications
                  </Link>
                </p>
              </SettingsSection>

              <SettingsSaveBar
                dirty={dirty}
                saving={update.isPending}
                onSave={() => void handleSave()}
                onDiscard={discard}
                saveLabel="Save AI settings"
              />
            </>
          )}
        </FramePanel>
      </Frame>
      {leaveGuard.alertDialog}
    </>
  );
}
