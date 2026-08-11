import {
  AlertCircleIcon,
  CheckIcon,
  ChevronDownIcon,
  CopyIcon,
  ExternalLinkIcon,
  GlobeIcon,
  Loader2Icon,
  PlusIcon,
  RefreshCwIcon,
  Trash2Icon
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type CustomDomainOutput, HostnameSchema } from "@tsu-stack/core";
import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
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
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger
} from "@tsu-stack/ui/components/collapsible";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle
} from "@tsu-stack/ui/components/empty";
import { Form } from "@tsu-stack/ui/components/form";
import {
  Frame,
  FrameDescription,
  FrameHeader,
  FramePanel,
  FrameTitle
} from "@tsu-stack/ui/components/frame";
import { Separator } from "@tsu-stack/ui/components/separator";
import { Skeleton } from "@tsu-stack/ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@tsu-stack/ui/components/table";
import { cn } from "@tsu-stack/ui/lib/utils";

import { useAppForm } from "@/shared/form";
import { getPrimaryAppOrigin } from "@/shared/lib/primary-app-url";
import { createZodFormValidator } from "@/shared/lib/zod-form-validator";

import {
  useGetCustomDomainQuery,
  useRemoveCustomDomainMutation,
  useSetCustomDomainMutation,
  useVerifyCustomDomainMutation
} from "@/features/domain";

const DomainHostnameFormSchema = z.object({
  hostname: HostnameSchema
});

type StatusMeta = {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary" | "outline";
};

function statusMeta(status: CustomDomainOutput["status"]): StatusMeta {
  switch (status) {
    case "verified":
      return { label: "Valid configuration", variant: "success" };
    case "failed":
      return { label: "Invalid configuration", variant: "destructive" };
    case "pending":
    default:
      return { label: "Pending verification", variant: "warning" };
  }
}

function sessionUsername(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  if (!("username" in user)) return undefined;
  const value = (user as { username?: unknown }).username;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function formatRelativeTime(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  const diffMs = Date.now() - date.getTime();
  const abs = Math.abs(diffMs);
  const minutes = Math.round(abs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return date.toLocaleDateString(undefined, { dateStyle: "medium" });
}

function dnsRecordsClipboard(domain: CustomDomainOutput): string {
  return [
    "Type: TXT",
    `Name: ${domain.verificationRecordName}`,
    `Value: ${domain.verificationRecordValue}`
  ].join("\n");
}

function CopyFieldButton({
  value,
  fieldKey,
  copiedField,
  onCopy,
  label
}: {
  value: string;
  fieldKey: string;
  copiedField: string | null;
  onCopy: (value: string, field: string) => void;
  label: string;
}) {
  const copied = copiedField === fieldKey;
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 shrink-0"
      onClick={() => onCopy(value, fieldKey)}
    >
      {copied ? <CheckIcon className="size-4" /> : <CopyIcon className="size-4" />}
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function DomainHostnameForm({
  initialHostname,
  submitLabel,
  isPending,
  showTokenWarning,
  onCancel,
  onSubmit
}: {
  initialHostname: string;
  submitLabel: string;
  isPending: boolean;
  showTokenWarning: boolean;
  onCancel?: () => void;
  onSubmit: (hostname: string) => Promise<void>;
}) {
  const form = useAppForm({
    defaultValues: { hostname: initialHostname },
    validators: {
      onChange: createZodFormValidator(DomainHostnameFormSchema)
    },
    onSubmit: async ({ value }) => {
      await onSubmit(value.hostname.trim());
    }
  });

  useEffect(() => {
    // Don't wipe in-progress edits when parent re-renders after a query refetch.
    if (form.store.state.isDirty) return;
    form.reset({ hostname: initialHostname });
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- re-sync when server hostname changes
  }, [initialHostname]);

  return (
    <Form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.AppField name="hostname">
        {(field) => (
          <field.InputField
            label="Domain"
            placeholder="portfolio.example.com"
            description="Hostname only — no https:// or path."
          />
        )}
      </form.AppField>

      {showTokenWarning ? (
        <Alert variant="warning">
          <AlertCircleIcon />
          <AlertTitle>New verification token</AlertTitle>
          <AlertDescription>
            Saving a different hostname issues a new TXT verification value. Update DNS before
            verifying again.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <form.AppForm>
          <form.SubmitButton isLoading={isPending}>{submitLabel}</form.SubmitButton>
        </form.AppForm>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isPending}>
            Cancel
          </Button>
        ) : null}
      </div>
    </Form>
  );
}

function DomainDnsTable({
  domain,
  copiedField,
  onCopy
}: {
  domain: CustomDomainOutput;
  copiedField: string | null;
  onCopy: (value: string, field: string) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Type</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="w-12 text-right">
                <span className="sr-only">Copy</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium">TXT</TableCell>
              <TableCell>
                <code className="block max-w-56 truncate font-mono text-xs sm:max-w-xs">
                  {domain.verificationRecordName}
                </code>
              </TableCell>
              <TableCell>
                <code className="block max-w-48 truncate font-mono text-xs sm:max-w-sm">
                  {domain.verificationRecordValue}
                </code>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-0.5">
                  <CopyFieldButton
                    value={domain.verificationRecordName}
                    fieldKey="record-name"
                    copiedField={copiedField}
                    onCopy={onCopy}
                    label="Copy record name"
                  />
                  <CopyFieldButton
                    value={domain.verificationRecordValue}
                    fieldKey="record-value"
                    copiedField={copiedField}
                    onCopy={onCopy}
                    label="Copy record value"
                  />
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onCopy(dnsRecordsClipboard(domain), "copy-all")}
      >
        {copiedField === "copy-all" ? (
          <>
            <CheckIcon className="size-4" />
            Copied
          </>
        ) : (
          <>
            <CopyIcon className="size-4" />
            Copy all records
          </>
        )}
      </Button>
    </div>
  );
}

export const DomainSettings = () => {
  const { user } = useAuth();
  const username = sessionUsername(user) ?? "";
  const primaryOrigin = getPrimaryAppOrigin();
  const pathUrl = username ? `${primaryOrigin}/${username}` : primaryOrigin;
  const dashboardUrl = `${primaryOrigin}/dashboard`;

  const {
    data: domain,
    isLoading,
    isPending,
    isError,
    error,
    refetch,
    isFetching
  } = useGetCustomDomainQuery();
  const setDomain = useSetCustomDomainMutation();
  const verifyDomain = useVerifyCustomDomainMutation();
  const removeDomain = useRemoveCustomDomainMutation();

  const loadErrorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof (error as { message: unknown }).message === "string"
        ? (error as { message: string }).message
        : null;
  const isUnauthorized = loadErrorMessage != null && /unauthorized/i.test(loadErrorMessage);

  const [showAddForm, setShowAddForm] = useState(false);
  const [showChangeForm, setShowChangeForm] = useState(false);
  const [dnsOpen, setDnsOpen] = useState(true);
  const [edgeOpen, setEdgeOpen] = useState(false);
  const [removeOpen, setRemoveOpen] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [lastVerifyError, setLastVerifyError] = useState<string | null>(null);

  const customUrl = useMemo(() => {
    if (!domain?.hostname) return null;
    return `https://${domain.hostname}`;
  }, [domain?.hostname]);

  // Expand DNS for pending/failed; collapse when verified (user choice 3A).
  useEffect(() => {
    if (!domain) return;
    setDnsOpen(domain.status !== "verified");
    setShowChangeForm(false);
    if (domain.status === "verified") {
      setLastVerifyError(null);
    }
  }, [domain?.id, domain?.status, domain?.hostname]);

  const handleCopy = useCallback(async (value: string, field: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success("Copied");
      window.setTimeout(() => {
        setCopiedField((current) => (current === field ? null : current));
      }, 2000);
    } catch {
      toast.error("Could not copy");
    }
  }, []);

  const handleSaveHostname = useCallback(
    async (hostname: string) => {
      try {
        await setDomain.mutateAsync({ hostname });
        setShowAddForm(false);
        setShowChangeForm(false);
        setLastVerifyError(null);
        toast.success("Domain saved — add the DNS TXT record, then verify");
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to save domain");
      }
    },
    [setDomain]
  );

  const handleVerify = useCallback(() => {
    setLastVerifyError(null);
    verifyDomain.mutate(undefined, {
      // Server throws DNS_NOT_VERIFIED (and marks failed) when TXT is missing.
      onSuccess: () => {
        setLastVerifyError(null);
        toast.success("Domain verified — portfolio is available on this host");
      },
      onError: (error) => {
        const message =
          error.message ||
          "We couldn’t find the expected TXT record yet. Confirm the name and value at your DNS provider, wait a few minutes, then try again.";
        setLastVerifyError(message);
        toast.error(message);
      }
    });
  }, [verifyDomain]);

  const handleRemove = useCallback(() => {
    removeDomain.mutate(undefined, {
      onSuccess: () => {
        setRemoveOpen(false);
        setShowAddForm(false);
        setShowChangeForm(false);
        setLastVerifyError(null);
        toast.success("Custom domain removed");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove domain");
      }
    });
  }, [removeDomain]);

  const lastChecked = domain ? formatRelativeTime(domain.updatedAt) : null;
  const isVerified = domain?.status === "verified";

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle className="flex items-center gap-2">
          <GlobeIcon className="size-4" />
          Domains
        </FrameTitle>
        <FrameDescription>
          Connect a custom hostname so your portfolio is served at{" "}
          <span className="font-medium text-foreground">/</span> on that host. Dashboard and sign-in
          stay on the app origin.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="space-y-8">
        {isPending || (isLoading && !isError) ? (
          <div className="space-y-3" aria-busy aria-label="Loading domain settings">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : isError && !isFetching ? (
          <Alert variant="error">
            <AlertCircleIcon />
            <AlertTitle>
              {isUnauthorized ? "Session expired" : "Couldn’t load domain settings"}
            </AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-pretty">
                {isUnauthorized
                  ? "Sign in again to manage custom domains."
                  : loadErrorMessage && !/failed to fetch|network/i.test(loadErrorMessage)
                    ? loadErrorMessage
                    : "Check your connection and try again."}
              </span>
              <div className="flex flex-wrap gap-2">
                {isUnauthorized ? (
                  <Button
                    type="button"
                    size="sm"
                    render={<a href="/sign-in?redirect=/dashboard/settings/domain" />}
                  >
                    Sign in
                  </Button>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => void refetch()}
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2Icon className="size-4 animate-spin" aria-hidden />
                      Retrying
                    </>
                  ) : (
                    "Retry"
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        ) : isError && isFetching ? (
          <div className="space-y-3" aria-busy aria-label="Retrying domain settings">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        ) : !domain ? (
          <div className="space-y-4">
            {!showAddForm ? (
              <Empty className="rounded-xl border py-12 md:py-14">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <GlobeIcon />
                  </EmptyMedia>
                  <EmptyTitle>No custom domain yet</EmptyTitle>
                  <EmptyDescription>
                    Add a hostname to serve your public portfolio at the root of your own domain.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button type="button" onClick={() => setShowAddForm(true)}>
                    <PlusIcon className="size-4" />
                    Add domain
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <div className="space-y-3 rounded-xl border p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">Add domain</p>
                  <p className="text-xs text-muted-foreground">
                    After saving, you’ll get a TXT record to prove ownership.
                  </p>
                </div>
                <DomainHostnameForm
                  initialHostname=""
                  submitLabel="Save domain"
                  isPending={setDomain.isPending}
                  showTokenWarning={false}
                  onCancel={() => setShowAddForm(false)}
                  onSubmit={handleSaveHostname}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Resource row */}
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Your domains</p>
              <div className="flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{domain.hostname}</p>
                    <Badge variant={statusMeta(domain.status).variant}>
                      {statusMeta(domain.status).label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastChecked ? `Last checked ${lastChecked}` : "Not verified yet"}
                    {domain.verifiedAt && domain.status === "verified" ? (
                      <>
                        {" · "}
                        Verified{" "}
                        {new Date(domain.verifiedAt).toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short"
                        })}
                      </>
                    ) : null}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {domain.status === "verified" && customUrl ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      render={<a href={customUrl} target="_blank" rel="noreferrer" />}
                    >
                      <ExternalLinkIcon className="size-4" />
                      Open
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowChangeForm((open) => !open)}
                  >
                    Change
                  </Button>
                </div>
              </div>

              {showChangeForm ? (
                <div className="space-y-3 rounded-xl border p-4">
                  <p className="text-sm font-medium">Change domain</p>
                  <DomainHostnameForm
                    initialHostname={domain.hostname}
                    submitLabel="Update domain"
                    isPending={setDomain.isPending}
                    showTokenWarning={true}
                    onCancel={() => setShowChangeForm(false)}
                    onSubmit={handleSaveHostname}
                  />
                </div>
              ) : null}
            </section>

            {/* Status + DNS (product verifies TXT only) */}
            <section className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  {isVerified ? "Status" : "Verify ownership"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {isVerified
                    ? "We only check the TXT ownership record. Re-check if you change DNS."
                    : "Add the TXT record at your DNS provider, then refresh. We only verify ownership — not reachability or TLS."}
                </p>
              </div>

              {domain.status === "failed" || lastVerifyError ? (
                <Alert variant="error">
                  <AlertCircleIcon />
                  <AlertTitle>Verification failed</AlertTitle>
                  <AlertDescription>
                    {lastVerifyError ??
                      `We couldn’t confirm the TXT record at ${domain.verificationRecordName}. Update DNS, wait for propagation, then refresh.`}
                  </AlertDescription>
                </Alert>
              ) : null}

              {isVerified ? (
                <Alert variant="success">
                  <CheckIcon />
                  <AlertTitle>Valid configuration</AlertTitle>
                  <AlertDescription>
                    Ownership is verified. Public portfolio traffic for this host is routed to your
                    portfolio.
                  </AlertDescription>
                </Alert>
              ) : null}

              <Collapsible open={dnsOpen} onOpenChange={setDnsOpen}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CollapsibleTrigger
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:underline"
                    )}
                  >
                    <ChevronDownIcon
                      className={cn(
                        "size-4 transition-transform duration-200",
                        dnsOpen ? "rotate-0" : "-rotate-90"
                      )}
                    />
                    DNS records
                  </CollapsibleTrigger>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleVerify}
                    disabled={verifyDomain.isPending}
                  >
                    {verifyDomain.isPending ? (
                      <>
                        <Loader2Icon className="size-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      <>
                        <RefreshCwIcon className="size-4" />
                        {isVerified ? "Re-check" : "Refresh configuration"}
                      </>
                    )}
                  </Button>
                </div>
                <CollapsiblePanel className="pt-3">
                  <DomainDnsTable
                    domain={domain}
                    copiedField={copiedField}
                    onCopy={(value, field) => void handleCopy(value, field)}
                  />
                </CollapsiblePanel>
              </Collapsible>

              <Collapsible open={edgeOpen} onOpenChange={setEdgeOpen}>
                <CollapsibleTrigger
                  className={cn(
                    "inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline"
                  )}
                >
                  <ChevronDownIcon
                    className={cn(
                      "size-4 transition-transform duration-200",
                      edgeOpen ? "rotate-0" : "-rotate-90"
                    )}
                  />
                  Edge setup (DNS & TLS)
                </CollapsibleTrigger>
                <CollapsiblePanel className="pt-2">
                  <p className="max-w-prose text-sm text-muted-foreground">
                    Point this hostname at the app (A/CNAME or proxy) and terminate HTTPS at
                    Cloudflare, Caddy, Nginx, or your host. We only verify the TXT ownership record
                    and route by Host — we do not check reachability or certificates.
                  </p>
                </CollapsiblePanel>
              </Collapsible>
            </section>

            <Separator />

            {/* Also available */}
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Also available</p>
              <ul className="space-y-2 text-sm">
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-28 shrink-0 text-muted-foreground">Path portfolio</span>
                  <a
                    href={pathUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-xs text-foreground underline-offset-4 hover:underline sm:text-sm"
                  >
                    {pathUrl}
                  </a>
                </li>
                <li className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="w-28 shrink-0 text-muted-foreground">Dashboard</span>
                  <a
                    href={dashboardUrl}
                    className="font-mono text-xs text-foreground underline-offset-4 hover:underline sm:text-sm"
                  >
                    {dashboardUrl}
                  </a>
                </li>
              </ul>
            </section>

            <Separator />

            {/* Danger zone */}
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Danger zone</p>
              <div className="flex flex-col gap-3 rounded-xl border border-destructive/24 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-0.5">
                  <p className="text-sm font-medium">Remove domain</p>
                  <p className="text-xs text-muted-foreground">
                    Stops routing this host to your portfolio. Path URL is unchanged.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => setRemoveOpen(true)}
                  disabled={removeDomain.isPending}
                >
                  <Trash2Icon className="size-4" />
                  Remove domain
                </Button>
              </div>
            </section>
          </div>
        )}
      </FramePanel>

      <AlertDialog open={removeOpen} onOpenChange={setRemoveOpen}>
        <AlertDialogPopup>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {domain?.hostname ?? "this domain"}?</AlertDialogTitle>
            <AlertDialogDescription>
              The portfolio will no longer be served on this host. You can add the domain again
              later; a new verification token will be issued.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogClose render={<Button variant="ghost" />}>Cancel</AlertDialogClose>
            <Button
              type="button"
              variant="destructive"
              onClick={handleRemove}
              disabled={removeDomain.isPending}
            >
              {removeDomain.isPending ? (
                <>
                  <Loader2Icon className="size-4 animate-spin" />
                  Removing…
                </>
              ) : (
                "Remove domain"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogPopup>
      </AlertDialog>
    </Frame>
  );
};
