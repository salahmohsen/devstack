import { Check, Copy, Globe, Loader2, Trash2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@tsu-stack/auth/react/tanstack-start/hooks";
import { type CustomDomainOutput } from "@tsu-stack/core";
import { Badge } from "@tsu-stack/ui/components/badge";
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

import { getPrimaryAppOrigin } from "@/shared/lib/primary-app-url";

import {
  useGetCustomDomainQuery,
  useRemoveCustomDomainMutation,
  useSetCustomDomainMutation,
  useVerifyCustomDomainMutation
} from "@/features/domain";

function statusBadge(status: CustomDomainOutput["status"]): {
  label: string;
  variant: "success" | "secondary" | "warning" | "destructive" | "outline";
} {
  switch (status) {
    case "verified":
      return { label: "Verified", variant: "success" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    case "pending":
    default:
      return { label: "Pending", variant: "warning" };
  }
}

function sessionProfileName(user: unknown): string | undefined {
  if (!user || typeof user !== "object") return undefined;
  if (!("profileName" in user)) return undefined;
  const value = (user as { profileName?: unknown }).profileName;
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export const DomainSettings = () => {
  const { user } = useAuth();
  const profileName = sessionProfileName(user) ?? "";
  const primaryOrigin = getPrimaryAppOrigin();
  const pathUrl = profileName ? `${primaryOrigin}/${profileName}` : primaryOrigin;

  const { data: domain, isLoading, isError } = useGetCustomDomainQuery();
  const setDomain = useSetCustomDomainMutation();
  const verifyDomain = useVerifyCustomDomainMutation();
  const removeDomain = useRemoveCustomDomainMutation();

  const [hostnameInput, setHostnameInput] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (domain?.hostname) {
      setHostnameInput(domain.hostname);
    }
  }, [domain?.hostname]);

  const customUrl = useMemo(() => {
    if (!domain?.hostname) return null;
    // HTTPS is terminated by the operator's reverse proxy / Cloudflare — not this app.
    return `https://${domain.hostname}`;
  }, [domain?.hostname]);

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

  const handleSave = useCallback(() => {
    const hostname = hostnameInput.trim();
    if (!hostname) {
      toast.error("Enter a domain name");
      return;
    }
    setDomain.mutate(
      { hostname },
      {
        onSuccess: () => {
          toast.success("Domain saved — add the DNS TXT record, then Verify");
        },
        onError: (error) => {
          toast.error(error.message || "Failed to save domain");
        }
      }
    );
  }, [hostnameInput, setDomain]);

  const handleVerify = useCallback(() => {
    verifyDomain.mutate(undefined, {
      onSuccess: () => {
        toast.success("Domain verified — public portfolio is available on this Host");
      },
      onError: (error) => {
        toast.error(error.message || "DNS verification failed");
      }
    });
  }, [verifyDomain]);

  const handleRemove = useCallback(() => {
    removeDomain.mutate(undefined, {
      onSuccess: () => {
        setHostnameInput("");
        toast.success("Custom domain removed");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to remove domain");
      }
    });
  }, [removeDomain]);

  return (
    <Frame>
      <FrameHeader>
        <FrameTitle className="flex items-center gap-2">
          <Globe className="size-4" />
          Custom domain
        </FrameTitle>
        <FrameDescription>
          Point your own domain at this app so your public portfolio is served at{" "}
          <span className="font-medium text-foreground">/</span> on that Host. Dashboard and sign-in
          stay on the primary app origin.
        </FrameDescription>
      </FrameHeader>

      <FramePanel className="space-y-6">
        <div className="space-y-2">
          <p className="text-sm font-medium">Public URLs</p>
          <ul className="space-y-1.5 text-sm text-muted-foreground">
            <li className="flex flex-wrap items-center gap-2">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">Path</span>
              <a
                href={pathUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-foreground underline-offset-4 hover:underline sm:text-sm"
              >
                {pathUrl}
              </a>
            </li>
            {domain?.status === "verified" && customUrl ? (
              <li className="flex flex-wrap items-center gap-2">
                <span className="text-xs tracking-wide text-muted-foreground uppercase">
                  Custom
                </span>
                <a
                  href={customUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-xs text-foreground underline-offset-4 hover:underline sm:text-sm"
                >
                  {customUrl}
                </a>
              </li>
            ) : null}
            <li className="flex flex-wrap items-center gap-2">
              <span className="text-xs tracking-wide text-muted-foreground uppercase">App</span>
              <a
                href={`${primaryOrigin}/dashboard`}
                className="font-mono text-xs text-foreground underline-offset-4 hover:underline sm:text-sm"
              >
                {primaryOrigin}/dashboard
              </a>
            </li>
          </ul>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading domain settings…</p>
        ) : isError ? (
          <p className="text-sm text-destructive">Failed to load domain settings.</p>
        ) : (
          <>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="custom-domain-hostname">Domain</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    id="custom-domain-hostname"
                    placeholder="portfolio.example.com"
                    value={hostnameInput}
                    onChange={(event) => setHostnameInput(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={setDomain.isPending}
                    className="sm:w-auto"
                  >
                    {setDomain.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Saving…
                      </>
                    ) : domain ? (
                      "Update domain"
                    ) : (
                      "Save domain"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Enter the hostname only (no https://). Replacing the domain generates a new
                  verification token.
                </p>
              </div>

              {domain ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <Badge variant={statusBadge(domain.status).variant}>
                    {statusBadge(domain.status).label}
                  </Badge>
                  {domain.verifiedAt ? (
                    <span className="text-xs text-muted-foreground">
                      Verified {new Date(domain.verifiedAt).toLocaleString()}
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            {domain ? (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium">DNS verification</p>
                  <p className="text-xs text-muted-foreground">
                    Create a <span className="font-medium text-foreground">TXT</span> record so we
                    can confirm you control this domain. Lookup is performed at{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px]">
                      {domain.verificationRecordName}
                    </code>
                    .
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name / host</Label>
                    <div className="flex items-center gap-1">
                      <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">
                        {domain.verificationRecordName}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() =>
                          void handleCopy(domain.verificationRecordName, "record-name")
                        }
                      >
                        {copiedField === "record-name" ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        <span className="sr-only">Copy record name</span>
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Value</Label>
                    <div className="flex items-center gap-1">
                      <code className="min-w-0 flex-1 truncate rounded-md border bg-background px-2 py-1.5 font-mono text-xs">
                        {domain.verificationRecordValue}
                      </code>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        onClick={() =>
                          void handleCopy(domain.verificationRecordValue, "record-value")
                        }
                      >
                        {copiedField === "record-value" ? (
                          <Check className="size-4" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                        <span className="sr-only">Copy record value</span>
                      </Button>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {/* HTTPS is not managed by this app — only DNS ownership + Host routing. */}
                  HTTPS/TLS is handled by your reverse proxy or Cloudflare (or Caddy, Nginx, etc.).
                  Point the domain at your app, terminate TLS there, then Verify here. This product
                  only checks DNS ownership and routes the Host to your portfolio.
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" onClick={handleVerify} disabled={verifyDomain.isPending}>
                    {verifyDomain.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Verifying…
                      </>
                    ) : (
                      "Verify DNS"
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRemove}
                    disabled={removeDomain.isPending}
                  >
                    {removeDomain.isPending ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Removing…
                      </>
                    ) : (
                      <>
                        <Trash2 className="size-4" />
                        Remove domain
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </>
        )}
      </FramePanel>
    </Frame>
  );
};
