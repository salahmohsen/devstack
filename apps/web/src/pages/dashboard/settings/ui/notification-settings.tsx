"use client";

import { useStore } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  EmailDeliveryModeSchema,
  NotificationChannelPrefsSchema,
  type EmailDeliveryMode,
  type NotificationChannelPrefs,
  type NotificationKind
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";
import { FieldGroup } from "@tsu-stack/ui/components/field";
import { Form } from "@tsu-stack/ui/components/form";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  type NotificationSettingsQueryResult
} from "@/features/notification-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsFrame } from "./settings-frame";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type FormState = {
  email: string;
  channels: NotificationChannelPrefs;
  emailDeliveryMode: EmailDeliveryMode;
};

const NotificationSettingsFormSchema = z.object({
  email: z
    .string()
    .trim()
    .max(320)
    .refine((value) => value === "" || z.string().email().safeParse(value).success, {
      message: "Enter a valid email address"
    }),
  channels: NotificationChannelPrefsSchema,
  emailDeliveryMode: EmailDeliveryModeSchema
});

const KIND_GROUPS: { title: string; kinds: NotificationKind[] }[] = [
  {
    title: "Mail & career",
    kinds: [
      "mail.classified.important",
      "mail.needs_action",
      "mail.apply_nudge",
      "mail.job_alerts_ready",
      "application.stage_auto",
      "application.silence_nudge",
      "application.ghosted_suggest"
    ]
  },
  {
    title: "Workflows",
    kinds: ["workflow.finished"]
  },
  {
    title: "Security",
    kinds: ["security.new_device_otp"]
  }
];

const EMAIL_DELIVERY_OPTIONS = [
  { value: "immediate", label: "Immediate" },
  { value: "digest", label: "Hourly digest" }
];

const NOTIFICATIONS_DESCRIPTION = (
  <>
    Choose where system alerts go. Reply auto-send is controlled in{" "}
    <Link
      to="/dashboard/settings/ai"
      className="font-medium text-foreground underline-offset-2 hover:underline"
    >
      AI settings
    </Link>
    , not here.
  </>
);

function formFromQuery(data: NotificationSettingsQueryResult): FormState {
  return {
    email: data.notificationEmail ?? data.accountEmail,
    channels: data.channels,
    emailDeliveryMode: data.emailDeliveryMode ?? "immediate"
  };
}

export function NotificationSettings() {
  const query = useGetNotificationSettingsQuery();

  if (query.isError) {
    return (
      <SettingsFrame title="Notifications" description="Could not load notification settings.">
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      </SettingsFrame>
    );
  }

  if (query.isLoading || !query.data) {
    return (
      <SettingsFrame title="Notifications" description={NOTIFICATIONS_DESCRIPTION}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading…
        </div>
      </SettingsFrame>
    );
  }

  return <NotificationSettingsForm data={query.data} />;
}

function NotificationSettingsForm({ data }: { data: NotificationSettingsQueryResult }) {
  const update = useUpdateNotificationSettingsMutation();
  const serverValues = useMemo(() => formFromQuery(data), [data]);

  const form = useAppForm({
    defaultValues: serverValues,
    validators: {
      onChange: createZodFormValidator(NotificationSettingsFormSchema)
    },
    onSubmit: async ({ value }) => {
      try {
        await update.mutateAsync({
          notificationEmail: value.email.trim(),
          channels: value.channels,
          emailDeliveryMode: value.emailDeliveryMode
        });
        form.reset(value);
        toast.success("Notification settings saved");
      } catch {
        toast.error("Could not save notification settings");
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
      <SettingsFrame
        title="Notifications"
        description={NOTIFICATIONS_DESCRIPTION}
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
            title="Destination"
            description="System mail (OTP, draft ready, …) is sent to this address."
          >
            <FieldGroup className="gap-2">
              <form.AppField name="email">
                {(field) => (
                  <field.InputField
                    type="email"
                    label="Notification email"
                    placeholder={data.accountEmail}
                    description={`Account email: ${data.accountEmail}`}
                  />
                )}
              </form.AppField>
              <form.Subscribe selector={(state) => state.values.email}>
                {(email) =>
                  email !== data.accountEmail ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => form.setFieldValue("email", data.accountEmail)}
                    >
                      Use account email
                    </Button>
                  ) : null
                }
              </form.Subscribe>
            </FieldGroup>
          </SettingsSection>

          <SettingsSection
            title="Email delivery"
            description="Security codes always send immediately. Other kinds can batch hourly."
          >
            <form.AppField name="emailDeliveryMode">
              {(field) => (
                <field.RadioGroupField options={EMAIL_DELIVERY_OPTIONS} orientation="horizontal" />
              )}
            </form.AppField>
          </SettingsSection>

          <SettingsSection
            title="Channels by kind"
            description="Toggle in-app and email delivery for each notification type."
          >
            <form.AppField name="channels">
              {(field) => <field.NotificationChannelsField groups={KIND_GROUPS} />}
            </form.AppField>
          </SettingsSection>
        </Form>
      </SettingsFrame>
      {leaveGuard.alertDialog}
    </>
  );
}
