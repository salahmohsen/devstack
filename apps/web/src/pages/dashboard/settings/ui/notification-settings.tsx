"use client";

import { Link } from "@tanstack/react-router";
import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  NOTIFICATION_KIND_DESCRIPTIONS,
  NOTIFICATION_KIND_LABELS,
  NOTIFICATION_KINDS,
  type EmailDeliveryMode,
  type NotificationChannelPrefs,
  type NotificationKind
} from "@tsu-stack/core";
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

import {
  useGetNotificationSettingsQuery,
  useUpdateNotificationSettingsMutation,
  type NotificationSettingsQueryResult
} from "@/features/notification-settings";

import { useSettingsDirtyGuard } from "./settings-dirty-guard";
import { SettingsSaveBar } from "./settings-save-bar";
import { SettingsSection } from "./settings-section";

type FormState = {
  email: string;
  channels: NotificationChannelPrefs;
  emailDeliveryMode: EmailDeliveryMode;
  accountEmail: string;
};

const KIND_GROUPS: { title: string; kinds: NotificationKind[] }[] = [
  {
    title: "Mail & career",
    kinds: [
      "mail.classified.important",
      "mail.needs_action",
      "mail.apply_nudge",
      "mail.job_alerts_ready",
      "application.stage_auto"
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

function channelsEqual(a: NotificationChannelPrefs, b: NotificationChannelPrefs): boolean {
  return NOTIFICATION_KINDS.every((k) => a[k].app === b[k].app && a[k].email === b[k].email);
}

function formFromQuery(data: NotificationSettingsQueryResult): FormState {
  return {
    email: data.notificationEmail ?? data.accountEmail,
    channels: data.channels,
    emailDeliveryMode: data.emailDeliveryMode ?? "immediate",
    accountEmail: data.accountEmail
  };
}

function NotificationSettingsHeader() {
  return (
    <FrameHeader>
      <FrameTitle>Notifications</FrameTitle>
      <FrameDescription>
        Choose where system alerts go. Reply auto-send is controlled in{" "}
        <Link
          to="/dashboard/settings/ai"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          AI settings
        </Link>
        , not here.
      </FrameDescription>
    </FrameHeader>
  );
}

/**
 * Shell: load / error / ready. Form hooks live only in the ready branch so React
 * Compiler never sees conditional hook counts across error/loading returns.
 */
export function NotificationSettings() {
  const query = useGetNotificationSettingsQuery();

  if (query.isError) {
    return (
      <Frame>
        <FrameHeader>
          <FrameTitle>Notifications</FrameTitle>
          <FrameDescription>Could not load notification settings.</FrameDescription>
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

  if (query.isLoading || !query.data) {
    return (
      <Frame>
        <NotificationSettingsHeader />
        <FramePanel>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Spinner className="size-4" />
            Loading…
          </div>
        </FramePanel>
      </Frame>
    );
  }

  return <NotificationSettingsForm data={query.data} />;
}

function NotificationSettingsForm({ data }: { data: NotificationSettingsQueryResult }) {
  const update = useUpdateNotificationSettingsMutation();
  const [draft, setDraft] = useState<FormState | null>(null);

  // Keep an open draft across refetches. Only re-sync from the server when there
  // is no local draft (initial load or after save/discard).
  const form = useMemo(() => {
    if (draft) return draft;
    return formFromQuery(data);
  }, [data, draft]);

  const dirty = useMemo(() => {
    const serverEmail = data.notificationEmail ?? data.accountEmail;
    if (form.email.trim() !== serverEmail.trim()) return true;
    if (form.emailDeliveryMode !== (data.emailDeliveryMode ?? "immediate")) return true;
    return !channelsEqual(form.channels, data.channels);
  }, [form, data]);

  const discard = useCallback(() => {
    setDraft(null);
  }, []);

  const leaveGuard = useSettingsDirtyGuard(dirty, { onDiscard: discard });

  function ensureDraft(): FormState {
    if (draft) return draft;
    const next = formFromQuery(data);
    setDraft(next);
    return next;
  }

  function patch(mutator: (current: FormState) => FormState) {
    setDraft(mutator(ensureDraft()));
  }

  async function handleSave() {
    try {
      await update.mutateAsync({
        notificationEmail: form.email.trim(),
        channels: form.channels,
        emailDeliveryMode: form.emailDeliveryMode
      });
      toast.success("Notification settings saved");
      setDraft(null);
    } catch {
      toast.error("Could not save notification settings");
    }
  }

  function setChannel(kind: NotificationKind, key: "app" | "email", value: boolean) {
    patch((current) => {
      return {
        ...current,
        channels: {
          ...current.channels,
          [kind]: { ...current.channels[kind], [key]: value }
        }
      };
    });
  }

  return (
    <>
      <Frame>
        <NotificationSettingsHeader />

        <FramePanel className="space-y-8">
          <SettingsSection
            title="Destination"
            description="System mail (OTP, draft ready, …) is sent to this address."
          >
            <div className="space-y-2">
              <Label htmlFor="notification-email">Notification email</Label>
              <Input
                id="notification-email"
                type="email"
                value={form.email}
                onChange={(e) =>
                  patch((current) => {
                    return {
                      ...current,
                      email: e.target.value
                    };
                  })
                }
                placeholder={form.accountEmail}
              />
              <p className="text-xs text-muted-foreground">Account email: {form.accountEmail}</p>
              {form.email !== form.accountEmail ? (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() =>
                    patch((current) => {
                      return {
                        ...current,
                        email: current.accountEmail
                      };
                    })
                  }
                >
                  Use account email
                </Button>
              ) : null}
            </div>
          </SettingsSection>

          <SettingsSection
            title="Email delivery"
            description="Security codes always send immediately. Other kinds can batch hourly."
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="email-delivery-mode"
                  checked={form.emailDeliveryMode === "immediate"}
                  onChange={() =>
                    patch((current) => {
                      return { ...current, emailDeliveryMode: "immediate" };
                    })
                  }
                />
                Immediate
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="email-delivery-mode"
                  checked={form.emailDeliveryMode === "digest"}
                  onChange={() =>
                    patch((current) => {
                      return { ...current, emailDeliveryMode: "digest" };
                    })
                  }
                />
                Hourly digest
              </label>
            </div>
          </SettingsSection>

          <SettingsSection
            title="Channels by kind"
            description="Toggle in-app and email delivery for each notification type."
          >
            <div className="overflow-hidden rounded-xl border border-border/80">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                <span>Type</span>
                <span className="w-14 text-center">App</span>
                <span className="w-14 text-center">Email</span>
              </div>
              {KIND_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="bg-muted/20 px-3 py-1.5 text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                    {group.title}
                  </p>
                  <ul className="divide-y">
                    {group.kinds.map((kind) => (
                      <li
                        key={kind}
                        className="grid grid-cols-[1fr_auto_auto] items-center gap-3 px-3 py-3"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{NOTIFICATION_KIND_LABELS[kind]}</p>
                          <p className="text-xs text-muted-foreground">
                            {NOTIFICATION_KIND_DESCRIPTIONS[kind]}
                          </p>
                        </div>
                        <div className="flex w-14 justify-center">
                          <Switch
                            checked={form.channels[kind].app}
                            onCheckedChange={(checked) => setChannel(kind, "app", checked)}
                            aria-label={`${NOTIFICATION_KIND_LABELS[kind]} app`}
                          />
                        </div>
                        <div className="flex w-14 justify-center">
                          <Switch
                            checked={form.channels[kind].email}
                            onCheckedChange={(checked) => setChannel(kind, "email", checked)}
                            aria-label={`${NOTIFICATION_KIND_LABELS[kind]} email`}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </SettingsSection>

          <SettingsSaveBar
            dirty={dirty}
            saving={update.isPending}
            onSave={() => void handleSave()}
            onDiscard={discard}
            saveLabel="Save notifications"
          />
        </FramePanel>
      </Frame>
      {leaveGuard.alertDialog}
    </>
  );
}
