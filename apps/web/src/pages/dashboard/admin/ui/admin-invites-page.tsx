import { Link2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SendInviteEmailsInputSchema, inviteSignupPath, inviteStatus } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import { Form } from "@tsu-stack/ui/components/form";
import { PromptDialog } from "@tsu-stack/ui/components/prompt-dialog";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import { useAppForm } from "@/shared/form";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useAdminInviteSignupsQuery,
  useCreateNamedInviteLinkMutation,
  useListAdminInvitesQuery,
  useRevokeAdminInviteMutation,
  useSendAdminInviteEmailsMutation
} from "@/features/admin";

import { ItemsEmpty } from "@/widgets/items-page";

import { SettingsFrame } from "@/pages/dashboard/settings/ui/settings-frame";
import { SettingsSection } from "@/pages/dashboard/settings/ui/settings-section";

import { formatAdminDate } from "./admin-format";

function inviteSignupHref(code: string): string {
  const path = inviteSignupPath(code);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function statusVariant(
  status: ReturnType<typeof inviteStatus>
): "success" | "secondary" | "warning" | "outline" {
  if (status === "open") return "success";
  if (status === "expired") return "warning";
  if (status === "revoked") return "outline";
  return "secondary";
}

export function AdminInvitesPage() {
  const { data: invites = [], isLoading, isError } = useListAdminInvitesQuery();
  const createLink = useCreateNamedInviteLinkMutation();
  const sendInvites = useSendAdminInviteEmailsMutation();
  const revokeInvite = useRevokeAdminInviteMutation();
  const [nameOpen, setNameOpen] = useState(false);
  const [signupsId, setSignupsId] = useState<string | null>(null);
  const signups = useAdminInviteSignupsQuery(signupsId);

  const linkForm = useAppForm({
    defaultValues: {
      name: "",
      maxUses: "" as string
    },
    onSubmit: ({ value }) => {
      const maxUsesRaw = value.maxUses.trim();
      createLink.mutate(
        {
          name: value.name.trim(),
          maxUses: maxUsesRaw ? Number.parseInt(maxUsesRaw, 10) : null
        },
        {
          onSuccess: (row) => {
            toast.success("Invite link created");
            void navigator.clipboard.writeText(inviteSignupHref(row.code)).catch(() => undefined);
            setNameOpen(false);
            linkForm.reset({ name: "", maxUses: "" });
          },
          onError: (error) => toast.error(error.message ?? "Failed to create invite")
        }
      );
    }
  });

  const emailForm = useAppForm({
    defaultValues: {
      emails: [] as string[],
      name: ""
    },
    validators: {
      onSubmit: createZodFormValidator(SendInviteEmailsInputSchema)
    },
    onSubmit: ({ value }) => {
      sendInvites.mutate(
        {
          emails: value.emails,
          name: value.name.trim() || undefined
        },
        {
          onSuccess: (result) => {
            const sent = result.sent.length;
            const failed = result.failed.length;
            if (sent > 0) toast.success(sent === 1 ? "Invite sent" : `${sent} invites sent`);
            if (failed > 0) {
              toast.error(result.failed.map((f) => `${f.email}: ${f.message}`).join(" · "));
            }
            emailForm.reset({ emails: [], name: "" });
          },
          onError: (error) => toast.error(error.message ?? "Failed to send invites")
        }
      );
    }
  });

  const handleRevoke = (id: string) => {
    revokeInvite.mutate(
      { id },
      {
        onSuccess: () => toast.success("Invite revoked"),
        onError: (error) => toast.error(error.message ?? "Failed to revoke invite")
      }
    );
  };

  return (
    <SettingsFrame
      title="Invites"
      description="Name a link, or email a one-time code. Signups show who used which."
      actions={
        <Button type="button" size="sm" variant="outline" onClick={() => setNameOpen(true)}>
          <Plus className="size-4" />
          Name a link
        </Button>
      }
    >
      <SettingsSection
        title="Invite by email"
        description="Each address gets its own one-time code. Optional shared name."
      >
        <Form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void emailForm.handleSubmit();
          }}
        >
          <emailForm.AppField name="name">
            {(field) => (
              <field.InputField
                label="Name"
                placeholder="Friends, cohort, waitlist…"
                description="Shown on the users table when they sign up."
              />
            )}
          </emailForm.AppField>
          <emailForm.AppField name="emails">
            {(field) => (
              <field.TagsField
                label="Emails"
                description="Press Enter after each address."
                placeholder="name@example.com"
                hint="Up to 20 emails"
                maxItems={20}
                maxItemLength={320}
                actions={
                  <emailForm.AppForm>
                    <emailForm.Subscribe selector={(s) => s.values.emails.length}>
                      {(count) => (
                        <Button
                          type="submit"
                          size="sm"
                          className="min-h-9 shrink-0 self-stretch rounded-lg"
                          loading={sendInvites.isPending}
                          disabled={count === 0}
                        >
                          Send invites
                        </Button>
                      )}
                    </emailForm.Subscribe>
                  </emailForm.AppForm>
                }
              />
            )}
          </emailForm.AppField>
        </Form>
      </SettingsSection>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading invites…</p>
      ) : isError ? (
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      ) : invites.length === 0 ? (
        <ItemsEmpty
          className="py-10 md:py-12"
          icon={<Link2 aria-hidden />}
          title="No invites yet"
          description="Name a link to copy, or send emails above."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Uses</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              const isRevoking = revokeInvite.isPending && revokeInvite.variables?.id === invite.id;
              return (
                <TableRow
                  key={invite.id}
                  className="cursor-pointer"
                  onClick={() => setSignupsId(invite.id)}
                >
                  <TableCell className="max-w-48 truncate text-sm font-medium">
                    {invite.name ?? (
                      <span className="font-normal text-muted-foreground">Unnamed</span>
                    )}
                    {invite.email ? (
                      <p className="truncate text-xs font-normal text-muted-foreground">
                        {invite.email}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="capitalize">{invite.kind}</TableCell>
                  <TableCell className="tabular-nums">
                    {invite.maxUses == null
                      ? String(invite.useCount)
                      : `${invite.useCount} / ${invite.maxUses}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(status)}>{status}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatAdminDate(invite.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <div className="inline-flex items-center justify-end gap-1">
                      {status === "open" ? (
                        <>
                          <CopyButton
                            value={inviteSignupHref(invite.code)}
                            label="Copy invite link"
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            onError={() => toast.error("Could not copy link")}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            title="Revoke invite"
                            aria-label="Revoke invite"
                            loading={isRevoking}
                            onClick={() => handleRevoke(invite.id)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}

      <PromptDialog
        open={nameOpen}
        onOpenChange={(open) => {
          if (!open && !createLink.isPending) setNameOpen(false);
        }}
        title="Name a link"
        description="People who sign up with this URL are attributed to this name."
        submitLabel="Create link"
        submitLoading={createLink.isPending}
        onSubmit={() => void linkForm.handleSubmit()}
      >
        <linkForm.AppField name="name">
          {(field) => <field.InputField label="Name" placeholder="Twitter Q3" />}
        </linkForm.AppField>
        <linkForm.AppField name="maxUses">
          {(field) => (
            <field.InputField
              label="Max uses"
              description="Leave empty for unlimited until you revoke."
              placeholder="Unlimited"
            />
          )}
        </linkForm.AppField>
      </PromptDialog>

      <Sheet open={Boolean(signupsId)} onOpenChange={(open) => !open && setSignupsId(null)}>
        <SheetPopup side="right" variant="inset" className="sm:max-w-lg">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pe-12">
            <SheetTitle>Signups</SheetTitle>
            <SheetDescription>People who used this invite.</SheetDescription>
            {signups.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (signups.data?.items.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                No one has signed up with this invite yet.
              </p>
            ) : (
              <ul className="space-y-3">
                {signups.data?.items.map((user) => (
                  <li key={user.id} className="text-sm">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-muted-foreground">
                      @{user.username} · {user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatAdminDate(user.usedAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </SheetPopup>
      </Sheet>
    </SettingsFrame>
  );
}
