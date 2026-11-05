"use client";

import {
  CheckCircle2Icon,
  CheckIcon,
  FlaskConicalIcon,
  KeyRoundIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { SiResend } from "react-icons/si";
import { toast } from "sonner";
import { z } from "zod";

import { mailSetupStatus, type TestMailSettingsInput } from "@tsu-stack/core";
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
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
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
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@tsu-stack/ui/components/input-group";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import {
  StatusSubmitButton,
  type StatusSubmitVisual
} from "@tsu-stack/ui/components/status-submit-button";
import { Switch } from "@tsu-stack/ui/components/switch";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";
import { useFormDirtyGuard } from "@/shared/ui/form-dirty-guard";
import {
  IntegrationBrandMark,
  IntegrationCard,
  IntegrationMeta
} from "@/shared/ui/integration-card";

import {
  useGetMailSettingsQuery,
  type MailSettingsQueryResult
} from "@/features/mail-settings/api/get-mail-settings.query";
import { useRotateMailWebhookMutation } from "@/features/mail-settings/api/rotate-mail-webhook.mutation";
import { useTestMailSettingsMutation } from "@/features/mail-settings/api/test-mail-settings.mutation";
import { useUpdateMailSettingsMutation } from "@/features/mail-settings/api/update-mail-settings.mutation";

const ConfigureSchema = z.object({
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

type ConfigureValues = z.infer<typeof ConfigureSchema>;

function valuesFromQuery(data: MailSettingsQueryResult): ConfigureValues {
  return {
    inboundAddress: data.inboundAddress ?? "",
    resendApiKey: "",
    clearResendApiKey: false,
    webhookSecret: "",
    clearWebhookSecret: false
  };
}

function testInputFromConfigure(
  value: Pick<
    ConfigureValues,
    "resendApiKey" | "webhookSecret" | "clearResendApiKey" | "clearWebhookSecret"
  >
): TestMailSettingsInput {
  const resendApiKey = value.resendApiKey.trim();
  const webhookSecret = value.webhookSecret.trim();
  return {
    ...(resendApiKey ? { resendApiKey } : {}),
    ...(webhookSecret ? { webhookSecret } : {}),
    ...(value.clearResendApiKey ? { clearResendApiKey: true } : {}),
    ...(value.clearWebhookSecret ? { clearWebhookSecret: true } : {})
  };
}

export function ResendIntegration() {
  const query = useGetMailSettingsQuery();
  const update = useUpdateMailSettingsMutation();
  const [configureOpen, setConfigureOpen] = useState(false);

  if (query.isLoading || query.isPending) {
    return (
      <IntegrationCard
        title="Resend"
        logo={
          <IntegrationBrandMark>
            <SiResend className="size-5" aria-hidden />
          </IntegrationBrandMark>
        }
        badge={
          <Badge variant="secondary" size="sm">
            Loading
          </Badge>
        }
        description="Career Inbox inbound via your Resend project."
        actions={
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Spinner className="size-3.5" />
            Loading…
          </span>
        }
      />
    );
  }

  if (query.isError || !query.data) {
    return (
      <IntegrationCard
        title="Resend"
        logo={
          <IntegrationBrandMark>
            <SiResend className="size-5" aria-hidden />
          </IntegrationBrandMark>
        }
        badge={
          <Badge variant="error" size="sm">
            Failed
          </Badge>
        }
        description="Could not load Resend settings."
        extra={
          <Alert variant="error" className="py-2">
            <AlertTitle className="text-xs">Failed to load</AlertTitle>
            <AlertDescription className="text-xs">Refresh and try again.</AlertDescription>
          </Alert>
        }
        actions={
          <Button type="button" size="sm" variant="outline" onClick={() => void query.refetch()}>
            Retry
          </Button>
        }
      />
    );
  }

  const data = query.data;
  const setup = mailSetupStatus(data);
  const secretsReady = setup === "ready" || setup === "paused";
  const inboundOn = setup === "ready";

  const description =
    setup === "need_webhook_secret"
      ? "API key is saved. Copy the webhook URL into Resend, then paste the signing secret it shows."
      : setup === "need_api_key"
        ? "Signing secret is saved. Add a Resend API key to send and fetch inbound mail."
        : setup === "need_secrets"
          ? "Add a Resend API key, then copy the webhook URL into Resend to get the signing secret."
          : inboundOn
            ? "Inbound is on. Resend posts email.received to your unique webhook URL."
            : "Secrets are saved, but inbound is paused. Resend gets 503 until you turn it on.";

  return (
    <>
      <IntegrationCard
        title="Resend"
        logo={
          <IntegrationBrandMark>
            <SiResend className="size-5" aria-hidden />
          </IntegrationBrandMark>
        }
        badge={<ResendStatusBadge setup={setup} />}
        description={description}
        meta={
          <IntegrationMeta
            rows={[
              data.inboundAddress
                ? { label: "Mailbox", value: data.inboundAddress }
                : { label: "Mailbox", value: "Any address", tone: "default" },
              {
                label: "API key",
                value: data.hasResendApiKey
                  ? data.resendApiKeyLast4
                    ? `Saved · ${data.resendApiKeyLast4}`
                    : "Saved"
                  : "Missing",
                tone: data.hasResendApiKey ? "default" : "warning"
              },
              {
                label: "Webhook",
                value: data.hasWebhookSecret
                  ? data.webhookSecretLast4
                    ? `Saved · ${data.webhookSecretLast4}`
                    : "Saved"
                  : "Missing",
                tone: data.hasWebhookSecret ? "default" : "warning"
              }
            ]}
          />
        }
        extra={
          !secretsReady ? (
            <Alert variant="warning" className="py-2">
              <TriangleAlertIcon />
              <AlertTitle className="text-xs">
                {setup === "need_webhook_secret"
                  ? "Add signing secret"
                  : setup === "need_api_key"
                    ? "Add API key"
                    : "Setup needed"}
              </AlertTitle>
              <AlertDescription className="text-xs">
                {setup === "need_webhook_secret"
                  ? "Resend only shows the signing secret after you add this webhook URL."
                  : setup === "need_api_key"
                    ? "Save a Resend API key to send replies and fetch inbound bodies."
                    : "Save the API key, copy the webhook URL into Resend, then paste the signing secret."}
              </AlertDescription>
            </Alert>
          ) : null
        }
        toggle={
          <Switch
            id="resend-inbound"
            checked={inboundOn}
            disabled={!secretsReady || update.isPending}
            onCheckedChange={(checked) => {
              update.mutate(
                { inboundEnabled: checked },
                {
                  onError: (error) => {
                    toast.error(
                      error instanceof Error ? error.message : "Could not update inbound"
                    );
                  }
                }
              );
            }}
            aria-label={inboundOn ? "Pause inbound mail" : "Accept inbound mail"}
          />
        }
        toggleCaption="Accept inbound mail"
        actions={
          <>
            <ResendTestButton disabled={!data.hasResendApiKey && !data.hasWebhookSecret} />
            <CopyButton
              value={data.webhookUrl}
              label="Copy URL"
              showLabel
              size="sm"
              variant="outline"
              iconSize={14}
              onError={() => toast.error("Could not copy URL")}
            />
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setConfigureOpen(true)}
            >
              <KeyRoundIcon className="size-3.5" aria-hidden />
              Configure
            </Button>
          </>
        }
      />

      <ResendConfigureDialog open={configureOpen} data={data} onOpenChange={setConfigureOpen} />
    </>
  );
}

function ResendStatusBadge({ setup }: { setup: ReturnType<typeof mailSetupStatus> }) {
  if (setup === "ready") {
    return (
      <Badge variant="success" size="sm" className="gap-1">
        <CheckCircle2Icon className="size-3" aria-hidden />
        On
      </Badge>
    );
  }
  if (setup === "paused") {
    return (
      <Badge variant="outline" size="sm">
        Paused
      </Badge>
    );
  }
  if (setup === "need_webhook_secret") {
    return (
      <Badge variant="warning" size="sm">
        Add signing secret
      </Badge>
    );
  }
  if (setup === "need_api_key") {
    return (
      <Badge variant="warning" size="sm">
        Add API key
      </Badge>
    );
  }
  return (
    <Badge variant="warning" size="sm">
      Setup needed
    </Badge>
  );
}

function ResendTestButton({
  draft,
  disabled
}: {
  draft?: TestMailSettingsInput;
  disabled?: boolean;
}) {
  const test = useTestMailSettingsMutation();
  const [flash, setFlash] = useState<"success" | "failed" | null>(null);
  useEffect(() => {
    if (flash !== "success") return;
    const timer = window.setTimeout(() => setFlash(null), 800);
    return () => window.clearTimeout(timer);
  }, [flash]);

  const state: StatusSubmitVisual = test.isPending
    ? "pending"
    : flash === "failed"
      ? "failed"
      : flash === "success"
        ? "success"
        : "idle";

  return (
    <StatusSubmitButton
      type="button"
      size="sm"
      idleVariant="outline"
      state={state}
      disabled={disabled === true || test.isPending || state === "success"}
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
        setFlash(null);
        void test.mutateAsync(draft ?? {}).then(
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
            toast.error(error instanceof Error ? error.message : "Could not test Resend");
          }
        );
      }}
    />
  );
}

function ResendConfigureDialog({
  open,
  data,
  onOpenChange
}: {
  open: boolean;
  data: MailSettingsQueryResult;
  onOpenChange: (open: boolean) => void;
}) {
  const update = useUpdateMailSettingsMutation();
  const test = useTestMailSettingsMutation();
  const rotateWebhook = useRotateMailWebhookMutation();
  const [rotateOpen, setRotateOpen] = useState(false);
  const [saveFlash, setSaveFlash] = useState<"failed" | null>(null);
  const pending = test.isPending || update.isPending;

  const form = useAppForm({
    defaultValues: valuesFromQuery(data),
    validators: {
      onChange: createZodFormValidator(ConfigureSchema)
    },
    onSubmit: async ({ value }) => {
      setSaveFlash(null);
      try {
        const probed = await test.mutateAsync(testInputFromConfigure(value));
        if (!probed.ok) {
          setSaveFlash("failed");
          toast.error(probed.message);
          return;
        }
        const inboundAddress =
          value.inboundAddress.trim() === "" ? null : value.inboundAddress.trim();
        const inboundChanged = inboundAddress !== (data.inboundAddress ?? null);
        const saved = await update.mutateAsync({
          ...(inboundChanged ? { inboundAddress } : {}),
          resendApiKey: value.resendApiKey.trim() || undefined,
          clearResendApiKey: value.clearResendApiKey || undefined,
          webhookSecret: value.webhookSecret.trim() || undefined,
          clearWebhookSecret: value.clearWebhookSecret || undefined
        });
        form.reset(valuesFromQuery(saved));
        toast.success("Resend settings saved");
        onOpenChange(false);
      } catch (error) {
        setSaveFlash("failed");
        toast.error(error instanceof Error ? error.message : "Could not save Resend settings");
      }
    }
  });

  const wasOpenRef = useRef(false);
  useEffect(() => {
    const justOpened = open && !wasOpenRef.current;
    wasOpenRef.current = open;
    if (!justOpened) return;
    form.reset(valuesFromQuery(data));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- seed once when the dialog opens
  }, [open, data, form]);

  const close = () => {
    setSaveFlash(null);
    onOpenChange(false);
  };
  const { alertDialog, handleCloseAttempt } = useFormDirtyGuard(form, close);

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
            <DialogTitle>Configure Resend</DialogTitle>
            <DialogDescription>
              Copy the webhook URL into Resend first. Resend then shows the signing secret. API key
              and secret stay sealed on the server.
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
                <form.AppField name="inboundAddress">
                  {(field) => (
                    <field.InputField
                      type="email"
                      autoComplete="off"
                      label="Career email address"
                      description="Required for sending from your verified Resend domain. Also limits inbound mail to this address."
                      placeholder="jobs@your-domain.com"
                    />
                  )}
                </form.AppField>

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

                <div className="space-y-2">
                  <p className="text-sm font-medium">Webhook URL</p>
                  <p className="text-xs text-muted-foreground">
                    Paste this into Resend as the email.received endpoint. Resend then shows the
                    signing secret.
                  </p>
                  <InputGroup className="w-full">
                    <InputGroupInput
                      readOnly
                      value={data.webhookUrl}
                      aria-label="Resend webhook URL"
                      className="font-mono text-xs"
                    />
                    <InputGroupAddon align="inline-end">
                      <CopyButton
                        value={data.webhookUrl}
                        label="Copy webhook URL"
                        size="icon-xs"
                        variant="ghost"
                        iconSize={14}
                        onError={() => toast.error("Could not copy URL")}
                      />
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        aria-label="Rotate webhook URL"
                        disabled={rotateWebhook.isPending}
                        onClick={() => setRotateOpen(true)}
                      >
                        <RefreshCwIcon className="size-3.5" aria-hidden />
                      </Button>
                    </InputGroupAddon>
                  </InputGroup>
                </div>

                <form.Subscribe selector={(state) => state.values.clearWebhookSecret}>
                  {(cleared) => (
                    <form.AppField name="webhookSecret">
                      {(field) => (
                        <field.SecretInputField
                          label="Webhook signing secret"
                          description="From Resend after you add the webhook URL."
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
              </FieldGroup>
            </DialogPanel>
            <DialogFooter>
              <DialogCancel variant="ghost" disabled={pending} icon={<XIcon aria-hidden />}>
                Cancel
              </DialogCancel>
              <form.Subscribe
                selector={(state) => {
                  return {
                    resendApiKey: state.values.resendApiKey,
                    webhookSecret: state.values.webhookSecret,
                    clearResendApiKey: state.values.clearResendApiKey,
                    clearWebhookSecret: state.values.clearWebhookSecret
                  };
                }}
              >
                {(draft) => (
                  <Group>
                    {pending ? null : (
                      <>
                        <ResendTestButton
                          draft={testInputFromConfigure(draft)}
                          disabled={
                            draft.clearResendApiKey ||
                            (!data.hasResendApiKey && !draft.resendApiKey.trim())
                          }
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

      <AlertDialog open={rotateOpen} onOpenChange={setRotateOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Rotate webhook URL?</AlertDialogTitle>
            <AlertDialogDescription>
              This issues a new endpoint immediately. Update the webhook in Resend or inbound mail
              will stop.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <DialogAction
              variant="destructive"
              loading={rotateWebhook.isPending}
              onClick={() => {
                void rotateWebhook.mutateAsync().then(
                  () => {
                    setRotateOpen(false);
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

      {alertDialog}
    </>
  );
}
