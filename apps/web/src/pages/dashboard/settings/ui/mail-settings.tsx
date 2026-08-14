"use client";

import { useStore } from "@tanstack/react-form";
import { InboxIcon, RefreshCwIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import { DialogAction } from "@tsu-stack/ui/components/dialog";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Input } from "@tsu-stack/ui/components/input";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { StatusSubmitButton } from "@tsu-stack/ui/components/status-submit-button";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useGetMailSettingsQuery,
  useRotateMailWebhookMutation,
  useUpdateMailSettingsMutation,
  type MailSettingsQueryResult
} from "@/features/mail-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

const MAIL_FRAME_DESCRIPTION =
  "Bring your own Resend project for inbound career mail. Secrets stay sealed on the server. Gmail OAuth is under Settings → Integrations — separate from Resend.";

type FormState = {
  inboundEnabled: boolean;
  inboundAddress: string;
  resendApiKey: string;
  clearResendApiKey: boolean;
  webhookSecret: string;
  clearWebhookSecret: boolean;
};

const MailSettingsFormSchema = z.object({
  inboundEnabled: z.boolean(),
  inboundAddress: z
    .string()
    .trim()
    .max(320)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid inbound email address"
    }),
  resendApiKey: z.string().max(512),
  clearResendApiKey: z.boolean(),
  webhookSecret: z.string().max(512),
  clearWebhookSecret: z.boolean()
});

function formFromQuery(data: MailSettingsQueryResult): FormState {
  return {
    inboundEnabled: Boolean(data.inboundEnabled),
    inboundAddress: data.inboundAddress ?? "",
    resendApiKey: "",
    clearResendApiKey: false,
    webhookSecret: "",
    clearWebhookSecret: false
  };
}

export function MailSettings() {
  const query = useGetMailSettingsQuery();

  if (query.isError) {
    return (
      <SettingsFrame
        title="Career Inbox · Resend"
        icon={<InboxIcon className="size-4 opacity-80" aria-hidden />}
        description="Could not load mail settings."
      >
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>
            Refresh the page or try again later. If this persists, restart the API server so
            <code className="mx-1 rounded bg-muted px-1">mailSettings</code>
            is registered.
          </AlertDescription>
        </Alert>
      </SettingsFrame>
    );
  }

  if (query.isLoading || query.isPending || !query.data) {
    return (
      <SettingsFrame
        title="Career Inbox · Resend"
        icon={<InboxIcon className="size-4 opacity-80" aria-hidden />}
        description={MAIL_FRAME_DESCRIPTION}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading mail settings…
        </div>
      </SettingsFrame>
    );
  }

  return <MailSettingsForm data={query.data} />;
}

function MailSettingsForm({ data }: { data: MailSettingsQueryResult }) {
  const update = useUpdateMailSettingsMutation();
  const rotateWebhook = useRotateMailWebhookMutation();
  const [rotateOpen, setRotateOpen] = useState(false);
  const serverValues = useMemo(() => formFromQuery(data), [data]);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(MailSettingsFormSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        const saved = await update.mutateAsync({
          inboundEnabled: value.inboundEnabled,
          inboundAddress: value.inboundAddress.trim() === "" ? null : value.inboundAddress.trim(),
          resendApiKey: value.resendApiKey.trim() || undefined,
          clearResendApiKey: value.clearResendApiKey || undefined,
          webhookSecret: value.webhookSecret.trim() || undefined,
          clearWebhookSecret: value.clearWebhookSecret || undefined
        });
        form.reset(formFromQuery(saved));
        toast.success("Mail settings saved");
      } catch {
        toast.error("Could not save mail settings");
      }
    }
  });

  useEffect(() => {
    if (form.store.state.isDirty) return;
    form.reset(serverValues);
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- form API is stable; re-sync only when server values change
  }, [serverValues]);

  const discard = useCallback(() => {
    form.reset(serverValues);
  }, [form, serverValues]);

  const isDirty = useStore(form.store, (state) => state.isDirty);
  const values = useStore(form.store, (state) => state.values);
  const leaveGuard = useSettingsDirtyGuard(isDirty, { onDiscard: discard });

  return (
    <>
      {leaveGuard.alertDialog}

      <SettingsFrame
        title="Career Inbox · Resend"
        icon={<InboxIcon className="size-4 opacity-80" aria-hidden />}
        description={MAIL_FRAME_DESCRIPTION}
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
        contentClassName="space-y-6"
      >
        <Form
          className="space-y-6"
          onSubmit={(event) => {
            event.preventDefault();
            event.stopPropagation();
            void form.handleSubmit();
          }}
        >
          <SettingsSection
            title="Inbound"
            description="Saving both the Resend API key and webhook secret turns Accept inbound on automatically. Use the switch later as a pause/kill switch."
          >
            {data.hasResendApiKey && data.hasWebhookSecret && !data.inboundEnabled ? (
              <form.Subscribe selector={(state) => state.values.inboundEnabled}>
                {(inboundEnabled) =>
                  inboundEnabled ? null : (
                    <Alert>
                      <AlertTitle>Inbound is paused</AlertTitle>
                      <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <span>
                          API key and webhook secret are saved, but Accept inbound is off — Resend
                          gets 503 and mail is not stored.
                        </span>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="shrink-0"
                          onClick={() => form.setFieldValue("inboundEnabled", true)}
                        >
                          Enable inbound
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )
                }
              </form.Subscribe>
            ) : null}

            <FieldGroup className="gap-4">
              <form.AppField name="inboundEnabled">
                {(field) => (
                  <field.SwitchField
                    layout="card"
                    label="Accept inbound mail"
                    description="Auto-on when secrets are complete. Off returns 503 on your webhook URL."
                  />
                )}
              </form.AppField>

              <form.AppField name="inboundAddress">
                {(field) => (
                  <field.InputField
                    type="email"
                    autoComplete="off"
                    label="Inbound address"
                    description="Optional. When set, only messages addressed to this mailbox are stored."
                    placeholder="jobs@your-domain.com"
                  />
                )}
              </form.AppField>
            </FieldGroup>
          </SettingsSection>

          <SettingsSection
            title="Resend API key"
            description="Used to fetch full email bodies after email.received webhooks. Leave blank to keep the saved key."
          >
            <form.Subscribe selector={(state) => state.values.clearResendApiKey}>
              {(cleared) => (
                <form.AppField name="resendApiKey">
                  {(field) => (
                    <field.SecretInputField
                      label="API key"
                      autoComplete="new-password"
                      hasSavedSecret={data.hasResendApiKey}
                      savedLast4={data.resendApiKeyLast4}
                      placeholder={data.hasResendApiKey ? "Leave blank to keep" : "re_…"}
                      allowClear={data.hasResendApiKey}
                      cleared={cleared}
                      onClearedChange={(next) => form.setFieldValue("clearResendApiKey", next)}
                      clearAriaLabels={{
                        mark: "Remove key",
                        unmark: "Keep existing key"
                      }}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </SettingsSection>

          <SettingsSection
            title="Webhook signing secret"
            description="From Resend → Webhooks → your endpoint → Signing secret (whsec_…). Leave blank to keep the saved secret."
          >
            <form.Subscribe selector={(state) => state.values.clearWebhookSecret}>
              {(cleared) => (
                <form.AppField name="webhookSecret">
                  {(field) => (
                    <field.SecretInputField
                      label="Signing secret"
                      autoComplete="new-password"
                      hasSavedSecret={data.hasWebhookSecret}
                      savedLast4={data.webhookSecretLast4}
                      placeholder={data.hasWebhookSecret ? "Leave blank to keep" : "whsec_…"}
                      allowClear={data.hasWebhookSecret}
                      cleared={cleared}
                      onClearedChange={(next) => form.setFieldValue("clearWebhookSecret", next)}
                      clearAriaLabels={{
                        mark: "Remove secret",
                        unmark: "Keep existing secret"
                      }}
                    />
                  )}
                </form.AppField>
              )}
            </form.Subscribe>
          </SettingsSection>
        </Form>

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
              <CopyButton
                value={data.webhookUrl}
                label="Copy"
                showLabel
                size="sm"
                variant="outline"
                iconSize={14}
                onError={() => toast.error("Could not copy URL")}
              />
              <StatusSubmitButton
                size="sm"
                idleVariant="outline"
                loading={rotateWebhook.isPending}
                label={rotateWebhook.isPending ? "Rotating…" : "Rotate URL"}
                icon={<RefreshCwIcon className="size-3.5" />}
                disabled={rotateWebhook.isPending}
                onClick={() => setRotateOpen(true)}
              />
            </div>
          </div>
        </SettingsSection>
      </SettingsFrame>

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate webhook URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This issues a new endpoint immediately. The current URL stops working. Update the
              webhook in Resend or inbound mail will stop. Unsaved form changes are not saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DialogAction
              variant="destructive"
              onClick={() => {
                setRotateOpen(false);
                void rotateWebhook.mutateAsync().then(
                  () => {
                    toast.success("Webhook URL rotated. Update Resend with the new URL.");
                  },
                  () => {
                    toast.error("Could not rotate webhook URL");
                  }
                );
              }}
            >
              Rotate URL
            </DialogAction>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </>
  );
}
