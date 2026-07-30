"use client";

import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { FingerprintIcon, KeyRoundIcon, Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { authClient } from "@tsu-stack/auth/react/auth-client";
import {
  AlertDialog,
  AlertDialogClose,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogPopup,
  AlertDialogTitle
} from "@tsu-stack/ui/components/alert-dialog";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";
import { cn } from "@tsu-stack/ui/lib/utils";

type PasskeyRow = {
  id: string;
  name?: string | null;
  deviceType?: string | null;
  backedUp?: boolean;
  createdAt?: Date | string | null;
  aaguid?: string | null;
};

function formatCreatedAt(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function deviceLabel(deviceType: string | null | undefined): string {
  if (deviceType === "platform") return "This device";
  if (deviceType === "cross-platform") return "Security key";
  return "Passkey";
}

function passkeyDisplayName(passkey: Pick<PasskeyRow, "name" | "deviceType">): string {
  const named = passkey.name?.trim();
  return named && named.length > 0 ? named : deviceLabel(passkey.deviceType);
}

async function fetchPasskeys(): Promise<PasskeyRow[]> {
  const result = await authClient.passkey.listUserPasskeys();
  if (result.error) {
    throw new Error(result.error.message ?? "Could not load passkeys");
  }
  return (result.data ?? []) as PasskeyRow[];
}

const passkeysQueryOptions = queryOptions({
  queryKey: ["auth", "passkeys"] as const,
  queryFn: fetchPasskeys,
  staleTime: 30_000
});

/**
 * Manage WebAuthn passkeys (add / list / remove) for the signed-in user.
 * Production-style security settings pattern: list + primary “Add” action.
 */
export function PasskeyManager({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<PasskeyRow | null>(null);

  const listQuery = useQuery(passkeysQueryOptions);

  const passkeys = useMemo(() => listQuery.data ?? [], [listQuery.data]);

  async function handleAddPasskey() {
    const name = newName.trim();
    setAdding(true);
    try {
      const result = await authClient.passkey.addPasskey({
        name: name.length > 0 ? name : undefined
      });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not add passkey");
      }
      toast.success("Passkey added");
      setNameDialogOpen(false);
      setNewName("");
      await queryClient.invalidateQueries({ queryKey: passkeysQueryOptions.queryKey });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not add passkey";
      // User canceling the browser prompt is not an error worth alarming about.
      if (/cancel|abort|not allowed|timed out/i.test(message)) {
        toast.message("Passkey registration canceled");
      } else {
        toast.error(message);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(passkey: PasskeyRow) {
    setBusyId(passkey.id);
    try {
      const result = await authClient.passkey.deletePasskey({ id: passkey.id });
      if (result.error) {
        throw new Error(result.error.message ?? "Could not remove passkey");
      }
      toast.success("Passkey removed");
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: passkeysQueryOptions.queryKey });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove passkey");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Sign in with Face ID, Touch ID, Windows Hello, or a hardware key.
        </p>
        <Button
          type="button"
          size="sm"
          onClick={() => {
            setNewName("");
            setNameDialogOpen(true);
          }}
          disabled={adding || listQuery.isLoading}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          Add passkey
        </Button>
      </div>

      {listQuery.isLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading passkeys…
        </div>
      ) : listQuery.isError ? (
        <div className="flex flex-col items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-4">
          <p className="text-sm text-destructive">
            {listQuery.error instanceof Error ? listQuery.error.message : "Could not load passkeys"}
          </p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void listQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : passkeys.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/80 px-4 py-10 text-center">
          <div className="flex size-10 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <FingerprintIcon className="size-5" aria-hidden />
          </div>
          <p className="text-sm font-medium text-foreground">No passkeys yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Add a passkey for faster, phishing-resistant sign-in on this account.
          </p>
        </div>
      ) : (
        <ul
          className="flex max-h-80 flex-col gap-2 overflow-y-auto overscroll-contain pe-0.5"
          aria-label="Registered passkeys"
        >
          {passkeys.map((passkey) => {
            const created = formatCreatedAt(passkey.createdAt);
            const label = passkeyDisplayName(passkey);
            return (
              <li
                key={passkey.id}
                className="flex items-start gap-3 rounded-lg border border-border/80 bg-card p-3"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {passkey.deviceType === "cross-platform" ? (
                    <KeyRoundIcon className="size-4" aria-hidden />
                  ) : (
                    <FingerprintIcon className="size-4" aria-hidden />
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-foreground">{label}</p>
                    {passkey.backedUp ? (
                      <Badge variant="secondary" size="sm">
                        Synced
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {deviceLabel(passkey.deviceType)}
                    {created ? ` · Added ${created}` : null}
                  </p>
                </div>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="ghost"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label={`Remove ${label}`}
                  disabled={busyId === passkey.id}
                  onClick={() => setDeleteTarget(passkey)}
                >
                  {busyId === passkey.id ? (
                    <Loader2Icon className="size-3.5 animate-spin" aria-hidden />
                  ) : (
                    <Trash2Icon className="size-3.5" aria-hidden />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Name before WebAuthn prompt — optional, modern apps always ask for a label */}
      <AlertDialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Add a passkey</AlertDialogTitle>
            <AlertDialogDescription>
              Give this passkey a name so you can tell devices apart (for example “MacBook” or
              “iPhone”). Your browser will ask you to confirm with biometrics or a security key.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 px-1 pb-2">
            <Label htmlFor="passkey-name">Name (optional)</Label>
            <Input
              id="passkey-name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="MacBook Touch ID"
              autoComplete="off"
              maxLength={64}
              disabled={adding}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" disabled={adding} />}>
              Cancel
            </AlertDialogClose>
            <Button type="button" loading={adding} onClick={() => void handleAddPasskey()}>
              Continue
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this passkey?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in with{" "}
              <span className="font-medium text-foreground">
                {deleteTarget ? passkeyDisplayName(deleteTarget) : "this passkey"}
              </span>
              . You can add it again later from this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={busyId != null}
              onClick={() => {
                if (deleteTarget) void handleDelete(deleteTarget);
              }}
            >
              Remove passkey
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </div>
  );
}
