"use client";

import { CheckIcon, CopyIcon, InboxIcon, RefreshCwIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { Switch } from "@tsu-stack/ui/components/switch";

import { useGetMailSettingsQuery, useUpdateMailSettingsMutation } from "@/features/mail-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type FormState = {
  sourceKey: number;
  inboundEnabled: boolean;
  inboundAddress: string;
  resendApiKey: string;
  clearResendApiKey: boolean;
  webhookSecret: string;
  clearWebhookSecret: boolean;
  rotateWebhookToken: boolean;
};

export function MailSettings() {
  const query = useGetMailSettingsQuery();
  const update = useUpdateMailSettingsMutation();
  const [draft, setDraft] = useState<FormState | null>(null);
  const [copied, setCopied] = useState(false);

  const form = useMemo(() => {
    if (!query.data) return null;
    if (draft && draft.sourceKey === query.dataUpdatedAt) return draft;
    return {
      sourceKey: query.dataUpdatedAt,
      inboundEnabled: query.data.inboundEnabled,
      inboundAddress: query.data.inboundAddress ?? "",
      resendApiKey: "",
      clearResendApiKey: false,
      webhookSecret: "",
      clearWebhookSecret: false,
      rotateWebhookToken: false
    } satisfies FormState;
  }, [query.data, query.dataUpdatedAt, draft]);

  const dirty = useMemo(() => {
    if (!form || !query.data) return false;
    if (form.inboundEnabled !== query.data.inboundEnabled) return true;
    if (form.inboundAddress.trim() !== (query.data.inboundAddress ?? "").trim()) return true;
    if (form.resendApiKey.trim() || form.clearResendApiKey) return true;
    if (form.webhookSecret.trim() || form.clearWebhookSecret) return true;
    if (form.rotateWebhookToken) return true;
    return false;
  }, [form, query.data]);

  function ensureDraft(): FormState | null {
    if (!query.data) return null;
    if (draft && draft.sourceKey === query.dataUpdatedAt) return draft;
    const next: FormState = {
      sourceKey: query.dataUpdatedAt,
      inboundEnabled: query.data.inboundEnabled,
      inboundAddress: query.data.inboundAddress ?? "",
      resendApiKey: "",
      clearResendApiKey: false,
      webhookSecret: "",
      clearWebhookSecret: false,
      rotateWebhookToken: false
    };
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

  async function handleSave() {
    if (!form) return;
    try {
      await update.mutateAsync({
        inboundEnabled: form.inboundEnabled,
        inboundAddress: form.inboundAddress.trim() || null,
        resendApiKey: form.resendApiKey.trim() || undefined,
        clearResendApiKey: form.clearResendApiKey || undefined,
        webhookSecret: form.webhookSecret.trim() || undefined,
        clearWebhookSecret: form.clearWebhookSecret || undefined,
        rotateWebhookToken: form.rotateWebhookToken || undefined
      });
      toast.success("Mail settings saved");
      setDraft(null);
    } catch {
      toast.error("Could not save mail settings");
    }
  }

  async function copyWebhookUrl() {
    if (!query.data?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(query.data.webhookUrl);
      setCopied(true);
      toast.success("Webhook URL copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy URL");
    }
  }

  if (query.isLoading || !form || !query.data) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Spinner className="size-4" />
        Loading mail settings…
      </div>
    );
  }

  if (query.isError) {
    return (
      <Alert variant="error">
        <AlertTitle>Could not load mail settings</AlertTitle>
        <AlertDescription>Refresh the page or try again in a moment.</AlertDescription>
      </Alert>
    );
  }

  const data = query.data;

  return (
    <div className="space-y-6 pb-4">
      {leaveGuard.alertDialog}

      <Frame>
        <FrameHeader>
          <FrameTitle className="flex items-center gap-2">
            <InboxIcon className="size-4 opacity-80" aria-hidden />
            Career Inbox · Resend
          </FrameTitle>
          <FrameDescription>
            Bring your own Resend project for inbound career mail. Secrets stay sealed on the
            server; the platform never uses a shared Resend key for your inbox.
          </FrameDescription>
        </FrameHeader>
        <FramePanel className="space-y-6">
          <SettingsSection
            title="Inbound"
            description="Enable only after you paste your Resend API key and webhook signing secret."
          >
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/80 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">Accept inbound mail</p>
                <p className="text-xs text-muted-foreground">
                  When off, your webhook URL returns 503.
                </p>
              </div>
              <Switch
                checked={form.inboundEnabled}
                onCheckedChange={(checked) => {
                  patch((c) => {
                    return { ...c, inboundEnabled: checked };
                  });
                }}
                aria-label="Accept inbound mail"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="mail-inbound-address">Inbound address</Label>
              <Input
                id="mail-inbound-address"
                type="email"
                autoComplete="off"
                placeholder="jobs@your-domain.com"
                value={form.inboundAddress}
                onChange={(e) => {
                  const value = e.target.value;
                  patch((c) => {
                    return { ...c, inboundAddress: value };
                  });
                }}
              />
              <p className="text-xs text-muted-foreground">
                Optional. When set, only messages addressed to this mailbox are stored.
              </p>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Resend API key"
            description="Used to fetch full email bodies after email.received webhooks."
          >
            <div className="space-y-1.5">
              <Label htmlFor="mail-resend-key">API key</Label>
              <Input
                id="mail-resend-key"
                type="password"
                autoComplete="new-password"
                placeholder={
                  data.hasResendApiKey
                    ? `Saved ···${data.resendApiKeyLast4 ?? "****"} — paste to replace`
                    : "re_…"
                }
                value={form.resendApiKey}
                disabled={form.clearResendApiKey}
                onChange={(e) => {
                  const value = e.target.value;
                  patch((c) => {
                    return { ...c, resendApiKey: value, clearResendApiKey: false };
                  });
                }}
              />
              {data.hasResendApiKey ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Key on file ends with ···{data.resendApiKeyLast4}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      patch((c) => {
                        return {
                          ...c,
                          clearResendApiKey: !c.clearResendApiKey,
                          resendApiKey: ""
                        };
                      });
                    }}
                  >
                    {form.clearResendApiKey ? "Keep existing key" : "Remove key"}
                  </Button>
                </div>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Webhook signing secret"
            description="From Resend → Webhooks → your endpoint → Signing secret (whsec_…)."
          >
            <div className="space-y-1.5">
              <Label htmlFor="mail-webhook-secret">Signing secret</Label>
              <Input
                id="mail-webhook-secret"
                type="password"
                autoComplete="new-password"
                placeholder={
                  data.hasWebhookSecret
                    ? `Saved ···${data.webhookSecretLast4 ?? "****"} — paste to replace`
                    : "whsec_…"
                }
                value={form.webhookSecret}
                disabled={form.clearWebhookSecret}
                onChange={(e) => {
                  const value = e.target.value;
                  patch((c) => {
                    return { ...c, webhookSecret: value, clearWebhookSecret: false };
                  });
                }}
              />
              {data.hasWebhookSecret ? (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <p className="text-xs text-muted-foreground">
                    Secret on file ends with ···{data.webhookSecretLast4}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs"
                    onClick={() => {
                      patch((c) => {
                        return {
                          ...c,
                          clearWebhookSecret: !c.clearWebhookSecret,
                          webhookSecret: ""
                        };
                      });
                    }}
                  >
                    {form.clearWebhookSecret ? "Keep existing secret" : "Remove secret"}
                  </Button>
                </div>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Webhook URL"
            description="Paste this into Resend as the endpoint for email.received. Unique per account."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Input
                readOnly
                value={data.webhookUrl}
                className="font-mono text-xs"
                aria-label="Resend webhook URL"
              />
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void copyWebhookUrl()}
                >
                  {copied ? (
                    <>
                      <CheckIcon className="size-3.5" />
                      Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="size-3.5" />
                      Copy
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={form.rotateWebhookToken ? "default" : "ghost"}
                  onClick={() => {
                    patch((c) => {
                      return { ...c, rotateWebhookToken: !c.rotateWebhookToken };
                    });
                  }}
                >
                  <RefreshCwIcon className="size-3.5" />
                  {form.rotateWebhookToken ? "Will rotate on save" : "Rotate URL"}
                </Button>
              </div>
            </div>
            {form.rotateWebhookToken ? (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                Saving will issue a new URL. Update Resend or inbound will stop.
              </p>
            ) : null}
          </SettingsSection>
        </FramePanel>
      </Frame>

      <SettingsSaveBar
        dirty={dirty}
        saving={update.isPending}
        onSave={() => void handleSave()}
        onDiscard={discard}
      />
    </div>
  );
}
