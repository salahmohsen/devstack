import { useNavigate } from "@tanstack/react-router";
import { MoreHorizontal, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import {
  MEMBER_ROLE,
  SUPER_ADMIN_ROLE,
  formatUserRole,
  type AdminUserListItem
} from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@tsu-stack/ui/components/avatar";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { ConfirmDialog } from "@tsu-stack/ui/components/confirm-dialog";
import { Input } from "@tsu-stack/ui/components/input";
import { Menu, MenuItem, MenuPopup, MenuTrigger } from "@tsu-stack/ui/components/menu";
import { Sheet, SheetDescription, SheetPopup, SheetTitle } from "@tsu-stack/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";

import {
  useAdminBanUserMutation,
  useAdminRevokeSessionsMutation,
  useAdminSetRoleMutation,
  useAdminUnbanUserMutation,
  useAdminUserQuery,
  useListAdminUsersQuery
} from "@/features/admin";

import { SettingsFrame } from "@/pages/dashboard/settings/ui/settings-frame";

import { formatAdminDate } from "./admin-format";

type ConfirmKind = "ban" | "unban" | "promote" | "demote" | "revoke" | "impersonate";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function AdminUsersPage() {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const trimmed = q.trim();
  const list = useListAdminUsersQuery({
    q: trimmed.length > 0 ? trimmed : undefined,
    limit: 50,
    offset: 0
  });
  const ban = useAdminBanUserMutation();
  const unban = useAdminUnbanUserMutation();
  const setRole = useAdminSetRoleMutation();
  const revoke = useAdminRevokeSessionsMutation();

  const [inspectId, setInspectId] = useState<string | null>(null);
  const detail = useAdminUserQuery(inspectId);
  const [confirm, setConfirm] = useState<{ kind: ConfirmKind; user: AdminUserListItem } | null>(
    null
  );

  const items = list.data?.items ?? [];
  const pending = ban.isPending || unban.isPending || setRole.isPending || revoke.isPending;

  const confirmCopy = useMemo(() => {
    if (!confirm) return null;
    const name = confirm.user.name;
    switch (confirm.kind) {
      case "ban":
        return {
          title: `Ban ${name}?`,
          description: "They cannot sign in. Their data stays. Sessions end immediately.",
          confirmLabel: "Ban",
          confirmVariant: "destructive" as const
        };
      case "unban":
        return {
          title: `Unban ${name}?`,
          description: "They can sign in again.",
          confirmLabel: "Unban",
          confirmVariant: "default" as const
        };
      case "promote":
        return {
          title: `Make ${name} a super admin?`,
          description: "They will see Admin and can manage every user on this install.",
          confirmLabel: "Promote",
          confirmVariant: "default" as const
        };
      case "demote":
        return {
          title: `Make ${name} a member?`,
          description: "They lose the Admin console. Their portfolio stays theirs.",
          confirmLabel: "Demote",
          confirmVariant: "destructive" as const
        };
      case "revoke":
        return {
          title: `Sign ${name} out everywhere?`,
          description: "All of their sessions end. They can sign in again.",
          confirmLabel: "Revoke sessions",
          confirmVariant: "destructive" as const
        };
      case "impersonate":
        return {
          title: `View as ${name}?`,
          description:
            "You will use their dashboard until you stop. Admin is hidden while viewing as them.",
          confirmLabel: "View as user",
          confirmVariant: "default" as const
        };
    }
  }, [confirm]);

  const runConfirm = () => {
    if (!confirm) return;
    const { kind, user } = confirm;
    const onError = (error: Error) => toast.error(error.message ?? "Request failed");

    if (kind === "ban") {
      ban.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success("User banned");
            setConfirm(null);
          },
          onError
        }
      );
      return;
    }
    if (kind === "unban") {
      unban.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success("User unbanned");
            setConfirm(null);
          },
          onError
        }
      );
      return;
    }
    if (kind === "promote" || kind === "demote") {
      setRole.mutate(
        { userId: user.id, role: kind === "promote" ? SUPER_ADMIN_ROLE : MEMBER_ROLE },
        {
          onSuccess: () => {
            toast.success(kind === "promote" ? "Promoted to super admin" : "Now a member");
            setConfirm(null);
          },
          onError
        }
      );
      return;
    }
    if (kind === "revoke") {
      revoke.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            toast.success("Sessions revoked");
            setConfirm(null);
          },
          onError
        }
      );
      return;
    }
    void authClient.admin
      .impersonateUser({ userId: user.id })
      .then(({ error }) => {
        if (error) {
          toast.error(error.message ?? "Could not impersonate");
          return;
        }
        setConfirm(null);
        void navigate({ to: "/dashboard" });
        window.location.assign("/dashboard");
      })
      .catch((error: Error) => onError(error));
  };

  return (
    <SettingsFrame
      title="Users"
      description={`${list.data?.total ?? "—"} accounts`}
      contentClassName="space-y-4"
    >
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search name, email, username"
          className="ps-8"
          aria-label="Search users"
        />
      </div>

      {list.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : list.isError ? (
        <Alert variant="error">
          <AlertTitle>Failed to load</AlertTitle>
          <AlertDescription>Refresh the page or try again later.</AlertDescription>
        </Alert>
      ) : (
        <div className="max-md:-mx-1 max-md:overflow-x-auto">
          <Table className="max-md:min-w-160">
            <TableHeader>
              <TableRow>
                <TableHead>Person</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invite</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right"> </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((user) => (
                <TableRow
                  key={user.id}
                  className="cursor-pointer"
                  onClick={() => setInspectId(user.id)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <Avatar className="size-8">
                        {user.image ? <AvatarImage src={user.image} alt="" /> : null}
                        <AvatarFallback>{initials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{user.name}</p>
                        <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="min-w-0">
                      <p className="truncate text-sm">{user.email}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.emailVerified ? "Verified" : "Unverified"}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.role === SUPER_ADMIN_ROLE ? "brand" : "secondary"}>
                      {formatUserRole(user.role)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={user.banned ? "destructive" : "success"}>
                      {user.banned ? "Banned" : "Active"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-sm">
                    {user.invite?.name ?? user.invite?.code ?? (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatAdminDate(user.createdAt)}
                  </TableCell>
                  <TableCell className="text-right" onClick={(event) => event.stopPropagation()}>
                    <Menu>
                      <MenuTrigger
                        render={
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-8"
                            aria-label={`Actions for ${user.name}`}
                          />
                        }
                      >
                        <MoreHorizontal className="size-4" />
                      </MenuTrigger>
                      <MenuPopup align="end">
                        <MenuItem onClick={() => setInspectId(user.id)}>View</MenuItem>
                        <MenuItem onClick={() => setConfirm({ kind: "impersonate", user })}>
                          View as user
                        </MenuItem>
                        {user.banned ? (
                          <MenuItem onClick={() => setConfirm({ kind: "unban", user })}>
                            Unban
                          </MenuItem>
                        ) : (
                          <MenuItem
                            variant="destructive"
                            onClick={() => setConfirm({ kind: "ban", user })}
                          >
                            Ban
                          </MenuItem>
                        )}
                        {user.role === SUPER_ADMIN_ROLE ? (
                          <MenuItem
                            variant="destructive"
                            onClick={() => setConfirm({ kind: "demote", user })}
                          >
                            Make member
                          </MenuItem>
                        ) : (
                          <MenuItem onClick={() => setConfirm({ kind: "promote", user })}>
                            Make super admin
                          </MenuItem>
                        )}
                        <MenuItem
                          variant="destructive"
                          onClick={() => setConfirm({ kind: "revoke", user })}
                        >
                          Revoke sessions
                        </MenuItem>
                      </MenuPopup>
                    </Menu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={Boolean(inspectId)} onOpenChange={(open) => !open && setInspectId(null)}>
        <SheetPopup side="right" variant="inset" className="sm:max-w-lg">
          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5 pe-12">
            <SheetTitle>User</SheetTitle>
            <SheetDescription className="sr-only">Account details</SheetDescription>
            {detail.isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : detail.data ? (
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-2 text-sm">
                <Detail label="Name" value={detail.data.name} />
                <Detail label="Username" value={`@${detail.data.username}`} />
                <Detail label="Email" value={detail.data.email} />
                <Detail label="Verified" value={detail.data.emailVerified ? "Yes" : "No"} />
                <Detail label="Phone" value={detail.data.phone ?? "—"} />
                <Detail label="Role" value={formatUserRole(detail.data.role)} />
                <Detail label="Status" value={detail.data.banned ? "Banned" : "Active"} />
                <Detail
                  label="Invite"
                  value={
                    detail.data.invite
                      ? `${detail.data.invite.name ?? "Unnamed"} (${detail.data.invite.code})`
                      : "—"
                  }
                />
                <Detail
                  label="Providers"
                  value={detail.data.providers.map((p) => p.providerId).join(", ") || "—"}
                />
                <Detail label="Domain" value={detail.data.customDomain ?? "—"} />
                <Detail label="Created" value={formatAdminDate(detail.data.createdAt)} />
                <Detail label="Last seen" value={formatAdminDate(detail.data.lastSeenAt)} />
                <Detail label="Sessions" value={String(detail.data.sessionCount)} />
                <Detail
                  label="Onboarding"
                  value={formatAdminDate(detail.data.onboardingCompletedAt)}
                />
                <Detail
                  label="Counts"
                  value={`${detail.data.counts.experiences} exp · ${detail.data.counts.projects} proj · ${detail.data.counts.stacks} skills · ${detail.data.counts.applications} jobs · ${detail.data.counts.mailMessages} mail`}
                />
                <dt className="text-muted-foreground">Summary</dt>
                <dd className="text-pretty whitespace-pre-wrap">
                  {detail.data.summary?.trim() ?? "—"}
                </dd>
              </dl>
            ) : (
              <p className="text-sm text-muted-foreground">Could not load this user.</p>
            )}
          </div>
        </SheetPopup>
      </Sheet>

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => {
          if (!open && !pending) setConfirm(null);
        }}
        title={confirmCopy?.title ?? ""}
        description={confirmCopy?.description}
        confirmLabel={confirmCopy?.confirmLabel}
        confirmVariant={confirmCopy?.confirmVariant}
        confirmLoading={pending}
        onConfirm={runConfirm}
      />
    </SettingsFrame>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 wrap-break-word">{value}</dd>
    </>
  );
}
