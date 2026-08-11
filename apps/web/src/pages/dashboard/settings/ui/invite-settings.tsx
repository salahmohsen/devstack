import { Link2, Plus, Trash2 } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { type InviteOutput } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { CopyButton } from "@tsu-stack/ui/components/copy-button";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import {
  useCreateInviteMutation,
  useListInvitesQuery,
  useRevokeInviteMutation
} from "@/features/invite";

import { ItemsEmpty } from "@/widgets/items-page";

function inviteSignupPath(code: string): string {
  return `/sign-in/create-an-account?invite=${encodeURIComponent(code)}`;
}

function inviteSignupUrl(code: string): string {
  if (typeof window === "undefined") {
    return inviteSignupPath(code);
  }
  return `${window.location.origin}${inviteSignupPath(code)}`;
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
  const revokeInvite = useRevokeInviteMutation();

  const handleCreate = useCallback(() => {
    createInvite.mutate(
      {},
      {
        onSuccess: () => {
          toast.success("Invite created");
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
    <Frame>
      <FrameHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <FrameTitle>Invites</FrameTitle>
          <FrameDescription>Share a one-time signup link. Each code works once.</FrameDescription>
        </div>
        <Button type="button" size="sm" onClick={handleCreate} disabled={createInvite.isPending}>
          <Plus className="size-4" />
          {createInvite.isPending ? "Creating…" : "Create invite"}
        </Button>
      </FrameHeader>

      <FramePanel>
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
            description="Share a one-time signup link. Each code works once."
            action={
              <Button
                type="button"
                onClick={handleCreate}
                disabled={createInvite.isPending}
                loading={createInvite.isPending}
              >
                <Plus aria-hidden />
                Create invite
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invites.map((invite) => {
                const status = inviteStatus(invite);
                const isUnused = !invite.usedAt;
                const isRevoking =
                  revokeInvite.isPending && revokeInvite.variables?.id === invite.id;

                return (
                  <TableRow key={invite.id}>
                    <TableCell className="font-mono text-xs sm:text-sm">{invite.code}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant}>{status.label}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.createdAt)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(invite.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        {isUnused ? (
                          <>
                            <CopyButton
                              value={inviteSignupUrl(invite.code)}
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
      </FramePanel>
    </Frame>
  );
};
