"use client";

import { CheckCircle2Icon, FlaskConicalIcon, KeyRoundIcon, XCircleIcon } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AI_PROVIDER_FEATURED,
  aiProviderLabel,
  MASTRA_PROVIDER_CATALOG,
  type AiProviderPublic
} from "@tsu-stack/core";
import { Button } from "@tsu-stack/ui/components/button";
import { Field, FieldLabel } from "@tsu-stack/ui/components/field";
import {
  Select,
  SelectItem,
  SelectList,
  SelectPopup,
  SelectTrigger,
  SelectValue
} from "@tsu-stack/ui/components/select";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useListProviderModelsMutation } from "@/features/ai-settings/api/list-provider-models.mutation";
import { useTestAiProviderMutation } from "@/features/ai-settings/api/test-ai-provider.mutation";
import { useUpdateAiSettingsMutation } from "@/features/ai-settings/api/update-ai-settings.mutation";

const FEATURED_SET = new Set<string>(AI_PROVIDER_FEATURED);

const PROVIDER_OPTIONS = (() => {
  const featured = AI_PROVIDER_FEATURED.map((id) => {
    return { value: id, label: `${aiProviderLabel(id)} (${id})` };
  });
  const rest = MASTRA_PROVIDER_CATALOG.filter((p) => !FEATURED_SET.has(p.id)).map((p) => {
    return { value: p.id, label: `${p.name} (${p.id})` };
  });
  return [...featured, ...rest];
})();

type ProbeState = {
  /** Fields the probe was run against — a later edit invalidates it. */
  fingerprint: string;
  modelId: string | null;
  latencyMs: number;
  message: string;
};

export type ConnectAiCardProps = {
  providers: AiProviderPublic[];
  continueLabel?: string;
  /** Called after the provider is probed ok and saved. */
  onConfigured: () => void;
  /** Escape hatch slot (e.g. "I'll do this later"). */
  footer?: React.ReactNode;
  className?: string;
};

/**
 * Compact "Connect your AI" card shared by onboarding step 1 and the done-step
 * cross-sell. Continue is state-enforced: disabled until a probe passes for
 * the current provider + key + model triple.
 */
export function ConnectAiCard({
  providers,
  continueLabel = "Continue",
  onConfigured,
  footer,
  className
}: ConnectAiCardProps) {
  const testMutation = useTestAiProviderMutation();
  const modelsMutation = useListProviderModelsMutation();
  const updateMutation = useUpdateAiSettingsMutation();

  const [kind, setKind] = useState<string>(() => AI_PROVIDER_FEATURED[0] ?? "deepseek");
  const [apiKey, setApiKey] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [modelItems, setModelItems] = useState<Array<{ value: string; label: string }>>([]);
  const [probe, setProbe] = useState<ProbeState | null>(null);
  const [testError, setTestError] = useState<string | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  const trimmedKey = apiKey.trim();
  const fingerprint = `${kind}|${trimmedKey}|${modelId ?? ""}`;
  const probeValid = probe !== null && probe.fingerprint === fingerprint;
  const existingSameKind = providers.find((provider) => provider.kind === kind);
  const keyReady = trimmedKey.length > 0 || Boolean(existingSameKind?.hasApiKey);
  const pending = testMutation.isPending || updateMutation.isPending;

  // Keep the model pre-filled with the provider's catalog/probe default.
  // Debounced so typing the API key does not fetch per keystroke. Probe/model
  // resets happen in the change handlers (not here) — no sync setState in
  // effects.
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void modelsMutation
        .mutateAsync(trimmedKey ? { kind, apiKey: trimmedKey } : { kind })
        .then((result) => {
          if (cancelled) return;
          const items = result.models.map((model) => {
            return { value: model.id, label: model.label };
          });
          setModelItems(items);
          setModelId(items[0]?.value ?? null);
        })
        .catch(() => {
          if (cancelled) return;
          setModelItems([]);
          setModelId(null);
        });
    }, 300);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- refetch models on provider/key change
  }, [kind, trimmedKey]);

  const invalidateProbe = () => {
    setProbe(null);
    setTestError(null);
  };

  const handleTest = () => {
    if (!keyReady) return;
    setSaveFailed(false);
    void testMutation
      .mutateAsync({
        kind,
        ...(trimmedKey ? { apiKey: trimmedKey } : {}),
        ...(existingSameKind && !trimmedKey ? { providerId: existingSameKind.id } : {}),
        ...(modelId ? { modelId } : {})
      })
      .then((result) => {
        if (result.ok) {
          const settledModelId = result.modelId ?? modelId;
          setProbe({
            // Fingerprint the model the probe actually settled on — if the
            // probe returned a different default than preselected, the state
            // update below keeps the triple valid.
            fingerprint: `${kind}|${trimmedKey}|${settledModelId ?? ""}`,
            modelId: result.modelId,
            latencyMs: result.latencyMs,
            message: result.message
          });
          if (result.modelId && result.modelId !== modelId) setModelId(result.modelId);
          return;
        }
        setProbe(null);
        setTestError(result.message);
      })
      .catch((error: unknown) => {
        setProbe(null);
        setTestError(error instanceof Error ? error.message : "Could not test provider");
      });
  };

  const handleContinue = () => {
    if (!probeValid) return;
    setSaveFailed(false);
    const nextRow = {
      id: existingSameKind?.id ?? crypto.randomUUID(),
      kind: kind as AiProviderPublic["kind"],
      label: aiProviderLabel(kind),
      ...(trimmedKey ? { apiKey: trimmedKey } : {})
    };
    const nextProviders = existingSameKind
      ? providers.map((row) =>
          row.id === nextRow.id ? nextRow : { id: row.id, kind: row.kind, label: row.label }
        )
      : [
          ...providers.map((row) => {
            return { id: row.id, kind: row.kind, label: row.label };
          }),
          nextRow
        ];
    void updateMutation
      .mutateAsync({ replaceProviders: true, providers: nextProviders })
      .then(() => {
        onConfigured();
      })
      .catch(() => {
        setSaveFailed(true);
      });
  };

  const probeNode = useMemo(() => {
    if (probeValid && probe) {
      return (
        <output
          data-slot="connect-ai-probe-ok"
          className="flex items-center gap-1.5 text-xs text-success"
        >
          <CheckCircle2Icon className="size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0 truncate">
            Connected
            {probe.modelId ? ` · ${probe.modelId}` : ""}
            {probe.latencyMs > 0 ? ` · ${probe.latencyMs}ms` : ""}
          </span>
        </output>
      );
    }
    if (testError) {
      return (
        <p
          data-slot="connect-ai-probe-error"
          className="flex items-start gap-1.5 text-xs text-destructive"
          role="alert"
        >
          <XCircleIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          <span className="min-w-0">{testError}</span>
        </p>
      );
    }
    return null;
  }, [probe, probeValid, testError]);

  return (
    <div
      data-slot="connect-ai-card"
      className={cn(
        "flex w-full max-w-xl flex-col gap-4 rounded-2xl border border-border/70 bg-card p-5",
        "shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)]",
        className
      )}
    >
      <Field>
        <FieldLabel>Provider</FieldLabel>
        <Select
          value={kind}
          onValueChange={(value) => {
            if (!value) return;
            setKind(value);
            invalidateProbe();
          }}
          items={PROVIDER_OPTIONS}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectPopup>
            <SelectList>
              {PROVIDER_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectList>
          </SelectPopup>
        </Select>
      </Field>

      <Field>
        <FieldLabel>API key</FieldLabel>
        <input
          type="password"
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            invalidateProbe();
          }}
          autoComplete="new-password"
          placeholder={
            existingSameKind?.hasApiKey ? "Leave blank to keep saved key" : "Paste an API key"
          }
          className={cn(
            "h-9 w-full rounded-lg border border-input bg-background px-3 text-sm",
            "transition-[border-color,box-shadow] duration-150 motion-reduce:transition-none",
            "placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
          )}
        />
        <p className="text-xs text-muted-foreground">
          Sealed server-side — same storage as Settings → AI.
        </p>
      </Field>

      <Field>
        <FieldLabel>Model</FieldLabel>
        <Select
          value={modelId ?? ""}
          onValueChange={(value) => {
            setModelId(typeof value === "string" && value ? value : null);
            invalidateProbe();
          }}
          items={modelItems}
        >
          <SelectTrigger className="w-full">
            <SelectValue>{modelId ?? "Default model"}</SelectValue>
          </SelectTrigger>
          <SelectPopup>
            <SelectList>
              {modelItems.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No models listed.</div>
              ) : (
                modelItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))
              )}
            </SelectList>
          </SelectPopup>
        </Select>
      </Field>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!keyReady || testMutation.isPending}
          loading={testMutation.isPending}
          onClick={handleTest}
        >
          <FlaskConicalIcon aria-hidden />
          Test connection
        </Button>
        {probeNode}
      </div>

      {saveFailed ? (
        <p className="text-xs text-destructive" role="alert">
          Could not save the provider. Check the key and try again.
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-4">
        {footer}
        <Button
          type="button"
          size="sm"
          disabled={!probeValid || pending}
          loading={updateMutation.isPending}
          onClick={handleContinue}
        >
          <KeyRoundIcon aria-hidden />
          {continueLabel}
        </Button>
      </div>
    </div>
  );
}
