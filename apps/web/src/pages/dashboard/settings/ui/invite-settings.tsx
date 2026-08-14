import { Link2, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { inviteSignupPath, SendInviteEmailsInputSchema, type InviteOutput } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import { Form } from "@tsu-stack/ui/components/form";
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
  useCreateInviteMutation,
  useListInvitesQuery,
  useRevokeInviteMutation,
  useSendInviteEmailsMutation
} from "@/features/invite";

import { ItemsEmpty } from "@/widgets/items-page";

import { SettingsFrame } from "./settings-frame";

function inviteSignupHref(code: string): string {
  const path = inviteSignupPath(code);
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function formatDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  });
}

function inviteStatus(invite: InviteOutput): {
  label: string;
  variant: "success" | "secondary" | "warning" | "outline";
} {
  if (invite.usedAt) {
    return { label: "Used", variant: "secondary" };
  }
  if (invite.expiresAt && new Date(invite.expiresAt).getTime() < Date.now()) {
    return { label: "Expired", variant: "warning" };
  }
  return { label: "Available", variant: "success" };
}

export const InviteSettings = () => {
  const { data: invites = [], isLoading, isError } = useListInvitesQuery();
  const createInvite = useCreateInviteMutation();
  const sendInvites = useSendInviteEmailsMutation();
  const revokeInvite = useRevokeInviteMutation();

  const form = useAppForm({
    defaultValues: {
      emails: [] as string[]
    },
    validators: {
      onSubmit: createZodFormValidator(SendInviteEmailsInputSchema)
    },
    onSubmit: ({ value }) => {
      sendInvites.mutate(
        { emails: value.emails },
        {
          onSuccess: (result) => {
            const sent = result.sent.length;
            const failed = result.failed.length;
            if (sent > 0) {
              toast.success(sent === 1 ? "Invite sent" : `${sent} invites sent`);
            }
            if (failed > 0) {
              toast.error(result.failed.map((f) => `${f.email}: ${f.message}`).join(" · "));
            }
            form.reset({ emails: [] });
          },
          onError: (error) => {
            toast.error(error.message || "Failed to send invites");
          }
        }
      );
    }
  });

  const handleCreateLink = useCallback(() => {
    createInvite.mutate(
      {},
      {
        onSuccess: () => {
          toast.success("Invite link created");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to create invite");
        }
      }
    );
  }, [createInvite]);

  const handleRevoke = useCallback(
    (id: string) => {
      revokeInvite.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Invite revoked");
          },
          onError: (error) => {
            toast.error(error.message || "Failed to revoke invite");
          }
        }
      );
    },
    [revokeInvite]
  );

  return (
    <SettingsFrame
      title="Invites"
      description="Email one-time signup links, or copy a link. Each code works once."
      actions={
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleCreateLink}
          loading={createInvite.isPending}
        >
          <Plus className="size-4" />
          {createInvite.isPending ? "Creating…" : "Create link"}
        </Button>
      }
    >
      <Form
        className="mb-8"
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <form.AppField name="emails">
              {(field) => (
                <field.TagsField
                  label="Invite by email"
                  description="Press Enter after each address. Each person gets their own one-time code."
                  placeholder="name@example.com"
                  hint="Up to 20 emails"
                  maxItems={20}
                  maxItemLength={320}
                />
              )}
            </form.AppField>
          </div>
          <form.AppForm>
            <form.Subscribe selector={(s) => s.values.emails.length}>
              {(count) => (
                <Button
                  type="submit"
                  size="sm"
                  className="shrink-0"
                  loading={sendInvites.isPending}
                  disabled={count === 0}
                >
                  {sendInvites.isPending ? "Sending…" : "Send invites"}
                </Button>
              )}
            </form.Subscribe>
          </form.AppForm>
        </div>
      </Form>

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
          description="Add emails above to send the invite, or create a copyable link."
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invites.map((invite) => {
              const status = inviteStatus(invite);
              const isUnused = !invite.usedAt;
              const isRevoking = revokeInvite.isPending && revokeInvite.variables?.id === invite.id;

              return (
                <TableRow key={invite.id}>
                  <TableCell className="max-w-56 truncate text-sm">
                    {invite.email ?? <span className="text-muted-foreground">Link only</span>}
                  </TableCell>
                  <TableCell className="font-mono text-xs sm:text-sm">{invite.code}</TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(invite.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {isUnused ? (
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
                            className="size-8"
                            title="Open signup link"
                            onClick={() => {
                              window.open(
                                inviteSignupPath(invite.code),
                                "_blank",
                                "noopener,noreferrer"
                              );
                            }}
                          >
                            <Link2 className="size-4" />
                            <span className="sr-only">Open invite link</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="size-8 text-destructive hover:text-destructive"
                            title="Revoke invite"
                            disabled={isRevoking}
                            onClick={() => handleRevoke(invite.id)}
                          >
                            <Trash2 className="size-4" />
                            <span className="sr-only">Revoke invite</span>
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
    </SettingsFrame>
  );
};
