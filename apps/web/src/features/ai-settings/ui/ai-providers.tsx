"use client";

import {
  CheckCircle2Icon,
  CheckIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  XIcon
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  AI_FEATURE_LABELS,
  AI_FEATURES,
  AI_PROVIDER_FEATURED,
  aiProviderLabel,
  CHATGPT_PLAN_PROVIDER_KIND,
  MASTRA_PROVIDER_CATALOG,
  type AiModelProviderIdsMap,
  type AiProviderKind,
  type AiProviderPublic,
  type TestAiProviderInput
} from "@tsu-stack/core";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Dialog,
  DialogAction,
  DialogCancel,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle
} from "@tsu-stack/ui/components/dialog";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";
import { IntegrationCard, IntegrationMeta } from "@/shared/ui/integration-card";

import { useTestAiProviderMutation } from "@/features/ai-settings/api/test-ai-provider.mutation";
import { useUpdateAiSettingsMutation } from "@/features/ai-settings/api/update-ai-settings.mutation";
import { ProviderBrandMark } from "@/features/ai-settings/ui/provider-brand-mark";

const FLASH_HOLD_MS = 800;
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

const ConfigureSchema = z.object({
  kind: z.string().min(1, "Pick a provider"),
  label: z.string().trim().max(80),
  apiKey: z.string().max(512)
});

type ConfigureValues = z.infer<typeof ConfigureSchema>;

function usedByLabels(providerId: string, modelProviderIds: AiModelProviderIdsMap): string[] {
  return AI_FEATURES.filter((feature) => modelProviderIds[feature] === providerId).map(
    (feature) => AI_FEATURE_LABELS[feature]
  );
}

function testInputFromDraft(
  value: ConfigureValues,
  providerId?: string
): TestAiProviderInput | null {
  const apiKey = value.apiKey.trim();
  if (apiKey) {
    return { kind: value.kind, apiKey };
  }
  if (providerId) {
    return { kind: value.kind, providerId };
  }
  return null;
}

export function AiProvidersSection({
  providers: allProviders,
  modelProviderIds
}: {
  providers: AiProviderPublic[];
  modelProviderIds: AiModelProviderIdsMap;
}) {
  const providers = allProviders.filter((p) => p.kind !== CHATGPT_PLAN_PROVIDER_KIND);
  const [dialog, setDialog] = useState<
    { mode: "add" } | { mode: "edit"; provider: AiProviderPublic } | null
  >(null);

  return (
    <>
      <section className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-0.5">
            <h3 className="text-sm font-medium text-foreground">Providers</h3>
            <p className="text-xs text-muted-foreground">
              Keys stay sealed. Test a card or save from Configure — both ping the provider first.
            </p>
          </div>
          {providers.length > 0 ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDialog({ mode: "add" })}
            >
              <PlusIcon className="size-3.5" aria-hidden />
              Add provider
            </Button>
          ) : null}
        </div>
        {providers.length === 0 ? (
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
              <Button type="button" size="sm" onClick={() => setDialog({ mode: "add" })}>
                <PlusIcon className="size-3.5" aria-hidden />
                Add provider
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {providers.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                usedBy={usedByLabels(provider.id, modelProviderIds)}
                onConfigure={() => setDialog({ mode: "edit", provider })}
              />
            ))}
          </div>
        )}
      </section>

      <ProviderConfigureDialog
        open={dialog !== null}
        providers={providers}
        editing={dialog?.mode === "edit" ? dialog.provider : null}
        onOpenChange={(open) => {
          if (!open) setDialog(null);
        }}
      />
    </>
  );
}

function ProviderCard({
  provider,
  usedBy,
  onConfigure
}: {
  provider: AiProviderPublic;
  usedBy: string[];
  onConfigure: () => void;
}) {
  const ready = provider.hasApiKey;
  return (
    <IntegrationCard
      title={provider.label}
      logo={<ProviderBrandMark kind={provider.kind} />}
      badge={
        ready ? (
          <Badge variant="success" size="sm" className="gap-1">
            <CheckCircle2Icon className="size-3" aria-hidden />
            On
          </Badge>
        ) : (
          <Badge variant="warning" size="sm">
            Add API key
          </Badge>
        )
      }
      description={`${aiProviderLabel(provider.kind)} · ${provider.kind}`}
      meta={
        <IntegrationMeta
          rows={[
            {
              label: "API key",
              value: provider.hasApiKey
                ? provider.apiKeyLast4
                  ? `Saved · ${provider.apiKeyLast4}`
                  : "Saved"
                : "Missing",
              tone: provider.hasApiKey ? "default" : "warning"
            },
            usedBy.length > 0 ? { label: "Used by", value: usedBy.join(", ") } : null
          ]}
        />
      }
      actions={
        <>
          <ProviderTestButton
            kind={provider.kind}
            providerId={provider.id}
            disabled={!provider.hasApiKey}
          />
          <Button type="button" size="sm" variant="outline" onClick={onConfigure}>
            <KeyRoundIcon className="size-3.5" aria-hidden />
            Configure
          </Button>
        </>
      }
    />
  );
}

function ProviderTestButton({
  kind,
  providerId,
  draftApiKey,
  disabled
}: {
  kind: string;
  providerId?: string;
  draftApiKey?: string;
  disabled?: boolean;
}) {
  const test = useTestAiProviderMutation();
  const [flash, setFlash] = useState<"success" | "failed" | null>(null);
  useEffect(() => {
    if (flash !== "success") return;
    const timer = window.setTimeout(() => setFlash(null), FLASH_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const state: StatusSubmitVisual = test.isPending
    ? "pending"
    : flash === "failed"
      ? "failed"
      : flash === "success"
        ? "success"
        : "idle";

  const input = useMemo((): TestAiProviderInput | null => {
    const apiKey = draftApiKey?.trim();
    if (apiKey) return { kind, apiKey };
    if (providerId) return { kind, providerId };
    return null;
  }, [kind, providerId, draftApiKey]);

  return (
    <StatusSubmitButton
      type="button"
      size="sm"
      idleVariant="outline"
      state={state}
      disabled={disabled === true || input === null || test.isPending || state === "success"}
      icon={<FlaskConicalIcon aria-hidden />}
      label={
        state === "pending"
          ? "Testing…"
          : state === "success"
            ? "Passed"
            : state === "failed"
              ? "Failed"
              : "Test"
      }
      onClick={() => {
        if (!input) return;
        setFlash(null);
        void test.mutateAsync(input).then(
          (result) => {
            if (result.ok) {
              setFlash("success");
              toast.success(result.message);
              return;
            }
            setFlash("failed");
            toast.error(result.message);
          },
          (error) => {
            setFlash("failed");
            toast.error(error instanceof Error ? error.message : "Could not test provider");
          }
        );
      }}
    />
  );
}

function ProviderConfigureDialog({
  open,
  providers,
  editing,
  onOpenChange
}: {
  open: boolean;
  providers: AiProviderPublic[];
  editing: AiProviderPublic | null;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateAiSettingsMutation();
  const test = useTestAiProviderMutation();
  const [saveFlash, setSaveFlash] = useState<"failed" | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const pending = test.isPending || update.isPending;
  const isEdit = editing !== null;

  const form = useAppForm({
    defaultValues: {
      kind: editing?.kind ?? "deepseek",
      label: editing?.label ?? aiProviderLabel("deepseek"),
      apiKey: ""
    } satisfies ConfigureValues,
    validators: {
      onChange: createZodFormValidator(ConfigureSchema)
    },
    onSubmit: async ({ value }) => {
      setSaveFlash(null);
      const probe = testInputFromDraft(value, editing?.id);
      if (!probe) {
        setSaveFlash("failed");
        toast.error("Enter an API key to add this provider.");
        return;
      }
      try {
        const probed = await test.mutateAsync(probe);
        if (!probed.ok) {
          setSaveFlash("failed");
          toast.error(probed.message);
          return;
        }
        const label = value.label.trim() || aiProviderLabel(value.kind);
        const apiKey = value.apiKey.trim();
        const nextId = editing?.id ?? crypto.randomUUID();
        const nextRow = {
          id: nextId,
          kind: value.kind as AiProviderKind,
          label,
          ...(apiKey ? { apiKey } : {})
        };
        const nextProviders = isEdit
          ? providers.map((row) =>
              row.id === nextId
                ? nextRow
                : {
                    id: row.id,
                    kind: row.kind,
                    label: row.label
                  }
            )
          : [
              ...providers.map((row) => {
                return { id: row.id, kind: row.kind, label: row.label };
              }),
              nextRow
            ];
        await update.mutateAsync({
          replaceProviders: true,
          providers: nextProviders
        });
        toast.success(isEdit ? "Provider saved" : "Provider added");
        onOpenChange(false);
      } catch (error) {
        setSaveFlash("failed");
        toast.error(error instanceof Error ? error.message : "Could not save provider");
      }
    }
  });

  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    setSaveFlash(null);
    form.reset({
      kind: editing?.kind ?? "deepseek",
      label: editing?.label ?? aiProviderLabel("deepseek"),
      apiKey: ""
    });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- seed once when the dialog opens
  }, [open, editing, form]);

  const close = () => {
    setSaveFlash(null);
    onOpenChange(false);
  };
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, close);

  async function removeProvider() {
    if (!editing) return;
    try {
      await update.mutateAsync({
        replaceProviders: true,
        providers: providers
          .filter((row) => row.id !== editing.id)
          .map((row) => {
            return { id: row.id, kind: row.kind, label: row.label };
          })
      });
      setDeleteOpen(false);
      toast.success("Provider removed");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove provider");
    }
  }

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (next) {
            onOpenChange(true);
            return;
          }
          handleCloseAttempt();
        }}
      >
        <DialogPopup showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>{isEdit ? "Configure provider" : "Add provider"}</DialogTitle>
            <DialogDescription>
              {isEdit
                ? "Leave the key blank to keep the saved one. Save tests the key first."
                : "Pick a provider, name it, and paste an API key. Save tests the key first."}
            </DialogDescription>
          </DialogHeader>
          <Form
            className="contents"
            onSubmit={(event) => {
              event.preventDefault();
              event.stopPropagation();
              if (pending) return;
              void form.handleSubmit();
            }}
          >
            <DialogPanel>
              <FieldGroup className="gap-4">
                <form.AppField
                  name="kind"
                  listeners={{
                    onChange: ({ value }) => {
                      form.setFieldValue("label", aiProviderLabel(String(value ?? "")));
                    }
                  }}
                >
                  {(field) => (
                    <field.ComboboxField
                      label="Provider"
                      placeholder="Search providers…"
                      emptyMessage="No provider found."
                      items={PROVIDER_OPTIONS}
                    />
                  )}
                </form.AppField>
                <form.AppField name="label">
                  {(field) => (
                    <field.InputField label="Label" placeholder="Display name" autoComplete="off" />
                  )}
                </form.AppField>
                <form.AppField name="apiKey">
                  {(field) => (
                    <field.SecretInputField
                      label="API key"
                      autoComplete="new-password"
                      hasSavedSecret={Boolean(editing?.hasApiKey)}
                      savedLast4={editing?.apiKeyLast4}
                      placeholder={editing?.hasApiKey ? "Leave blank to keep" : "API key"}
                    />
                  )}
                </form.AppField>
              </FieldGroup>
            </DialogPanel>
            <DialogFooter>
              {isEdit ? (
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  className="sm:me-auto"
                  disabled={pending}
                  onClick={() => setDeleteOpen(true)}
                >
                  <Trash2Icon className="size-3.5" aria-hidden />
                  Remove
                </Button>
              ) : null}
              <DialogCancel variant="ghost" disabled={pending} icon={<XIcon aria-hidden />}>
                Cancel
              </DialogCancel>
              <form.Subscribe
                selector={(state) => {
                  return {
                    kind: state.values.kind,
                    apiKey: state.values.apiKey
                  };
                }}
              >
                {(draft) => (
                  <Group>
                    {pending ? null : (
                      <>
                        <ProviderTestButton
                          kind={draft.kind}
                          providerId={editing?.id}
                          draftApiKey={draft.apiKey}
                          disabled={!draft.apiKey.trim() && !editing?.hasApiKey}
                        />
                        <GroupSeparator />
                      </>
                    )}
                    <DialogAction
                      loading={pending}
                      state={saveFlash === "failed" ? "failed" : undefined}
                      disabled={pending}
                      icon={<CheckIcon aria-hidden />}
                      onClick={() => {
                        if (pending) return;
                        void form.handleSubmit();
                      }}
                    >
                      {test.isPending
                        ? "Testing…"
                        : update.isPending
                          ? "Saving…"
                          : saveFlash === "failed"
                            ? "Failed"
                            : "Save"}
                    </DialogAction>
                  </Group>
                )}
              </form.Subscribe>
            </DialogFooter>
          </Form>
        </DialogPopup>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {editing?.label ?? "this provider"}?</AlertDialogTitle>
            <AlertDialogDescription>
              Features bound to this key will fall back to another matching provider. The sealed key
              is deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              loading={update.isPending}
              onClick={() => {
                void removeProvider();
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      {alertDialog}
    </>
  );
}
