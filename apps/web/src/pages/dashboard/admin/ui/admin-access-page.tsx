import { toast } from "sonner";

import { type SignupMode } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Radio, RadioGroup } from "@tsu-stack/ui/components/radio-group";

import { useAdminAccessQuery, useSetSignupModeMutation } from "@/features/admin";

import { SettingsFrame } from "@/pages/dashboard/settings/ui/settings-frame";
import { SettingsSection } from "@/pages/dashboard/settings/ui/settings-section";

export function AdminAccessPage() {
  const access = useAdminAccessQuery();
  const setMode = useSetSignupModeMutation();
  const signupMode = access.data?.signupMode ?? "invite_only";

  const onChange = (value: unknown) => {
    if (value !== "invite_only" && value !== "open") return;
    const next = value as SignupMode;
    if (next === signupMode) return;
    setMode.mutate(
      { signupMode: next },
      {
        onSuccess: () =>
          toast.success(next === "open" ? "Registration is open" : "Registration is invite-only"),
        onError: (error) => toast.error(error.message ?? "Could not update access")
      }
    );
  };

  return (
    <SettingsFrame
      title="Access"
      description="Who can create an account on this install"
      contentClassName="space-y-8"
    >
      {access.isError ? (
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      ) : null}

      <SettingsSection
        title="Signup"
        description="The first user always bootstraps without an invite and becomes super admin."
      >
        <RadioGroup
          value={signupMode}
          onValueChange={onChange}
          disabled={access.isLoading || setMode.isPending}
          className="gap-3"
        >
          <div className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3 has-data-checked:border-foreground/20 has-data-checked:bg-background">
            <Radio value="invite_only" className="mt-0.5" aria-label="Invite only" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Invite only</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                New accounts need a valid named link or emailed invite after the first user.
              </span>
            </span>
          </div>
          <div className="flex cursor-pointer items-start gap-3 rounded-lg border border-border/80 p-3 has-data-checked:border-foreground/20 has-data-checked:bg-background">
            <Radio value="open" className="mt-0.5" aria-label="Open registration" />
            <span className="min-w-0">
              <span className="block text-sm font-medium">Open registration</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Anyone can create an account. An invite still attributes them when present.
              </span>
            </span>
          </div>
        </RadioGroup>
      </SettingsSection>

      <dl className="grid grid-cols-3 gap-3 text-sm">
        <Stat label="Users" value={access.data?.userCount} />
        <Stat label="Banned" value={access.data?.bannedCount} />
        <Stat label="Open invites" value={access.data?.openInviteCount} />
      </dl>
    </SettingsFrame>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-lg border border-border/80 px-3 py-2.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-lg font-medium tabular-nums">{value ?? "—"}</dd>
    </div>
  );
}
