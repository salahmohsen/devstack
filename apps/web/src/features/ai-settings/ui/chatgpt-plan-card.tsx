"use client";

import { isDefinedError } from "@orpc/client";
import {
  CheckCircle2Icon,
  ExternalLinkIcon,
  LinkIcon,
  TriangleAlertIcon,
  UnplugIcon
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Badge } from "@tsu-stack/ui/components/badge";
import { Button } from "@tsu-stack/ui/components/button";
import { Input } from "@tsu-stack/ui/components/input";
import { Label } from "@tsu-stack/ui/components/label";
import { Spinner } from "@tsu-stack/ui/components/spinner";

import {
  IntegrationBrandMark,
  IntegrationCard,
  IntegrationMeta
} from "@/shared/ui/integration-card";

import {
  useChatgptPlanCompleteMutation,
  useChatgptPlanDisconnectMutation,
  useChatgptPlanStartMutation,
  useChatgptPlanStatusQuery
} from "@/features/ai-settings/api/chatgpt-plan";

function formatExpiry(value: Date | string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function ChatgptPlanSection() {
  const status = useChatgptPlanStatusQuery();
  const start = useChatgptPlanStartMutation();
  const complete = useChatgptPlanCompleteMutation();
  const disconnect = useChatgptPlanDisconnectMutation();
  const [authorizeUrl, setAuthorizeUrl] = useState<string | null>(null);
  const [pasted, setPasted] = useState("");
  const [failure, setFailure] = useState<string | null>(null);

  const data = status.data;
  const connected = Boolean(data?.connected && data.planUsageEnabled);

  function beginSignIn() {
    setFailure(null);
    setPasted("");
    void start.mutateAsync({}).then(
      (result) => setAuthorizeUrl(result.authorizeUrl),
      () => toast.error("Could not start ChatGPT sign-in")
    );
  }

  function finishSignIn() {
    setFailure(null);
    void complete.mutateAsync({ callbackUrl: pasted.trim() }).then(
      () => {
        setAuthorizeUrl(null);
        setPasted("");
        toast.success("ChatGPT connected");
      },
      (error) => {
        setFailure(
          isDefinedError(error) && error.code === "CHATGPT_PLAN_SIGN_IN_FAILED"
            ? error.data.reason
            : "Could not finish ChatGPT sign-in. Start again."
        );
      }
    );
  }

  function disconnectPlan() {
    void disconnect.mutateAsync({}).then(
      (result) => {
        if (result.revoked) toast.success("ChatGPT disconnected");
        else {
          toast.warning(
            "Disconnected here, but OpenAI did not confirm the revoke. Remove the app in ChatGPT Settings to be sure."
          );
        }
      },
      () => toast.error("Could not disconnect ChatGPT")
    );
  }

  const badge = connected ? (
    <Badge variant="success" size="sm" className="gap-1">
      <CheckCircle2Icon className="size-3" aria-hidden />
      Connected
    </Badge>
  ) : data?.needsReconnect ? (
    <Badge variant="warning" size="sm">
      Reconnect
    </Badge>
  ) : (
    <Badge variant="outline" size="sm">
      Off
    </Badge>
  );

  return (
    <section className="space-y-3">
      <div className="min-w-0 space-y-0.5">
        <h3 className="text-sm font-medium text-foreground">ChatGPT plan</h3>
        <p className="text-xs text-muted-foreground">
          For the owner of this instance only. It signs in with your own ChatGPT Plus or Pro plan
          through OpenAI&apos;s Sign in with ChatGPT. Do not connect anyone else&apos;s plan.
        </p>
      </div>

      <IntegrationCard
        title="Use my ChatGPT plan"
        logo={
          <IntegrationBrandMark>
            <LinkIcon className="size-5" aria-hidden />
          </IntegrationBrandMark>
        }
        badge={badge}
        description="Run Hub, mail, resume import and apply packages on your plan instead of an API key. The five-hour usage limit is shared with ChatGPT and every other app using your plan."
        meta={
          <IntegrationMeta
            rows={[
              data?.email ? { label: "Account", value: data.email } : null,
              data?.planType ? { label: "Plan", value: data.planType } : null,
              connected && data?.accessExpiresAt
                ? { label: "Token", value: `Refreshes by ${formatExpiry(data.accessExpiresAt)}` }
                : null
            ]}
          />
        }
        extra={
          <div className="space-y-3">
            {data?.lastErrorCode === "CHATGPT_PLAN_LIMIT" ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>ChatGPT plan limit reached</AlertTitle>
                <AlertDescription>
                  Requests on your plan are paused for a few minutes. Try again later, or check
                  usage in ChatGPT settings.
                </AlertDescription>
              </Alert>
            ) : null}
            {data?.needsReconnect ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>Reconnect ChatGPT</AlertTitle>
                <AlertDescription>
                  The sign-in expired or was revoked. Connect again to keep using your plan.
                </AlertDescription>
              </Alert>
            ) : null}
            {data && data.connected && !data.planUsageEnabled ? (
              <Alert variant="warning">
                <TriangleAlertIcon />
                <AlertTitle>Plan usage not allowed</AlertTitle>
                <AlertDescription>
                  You signed in but did not approve plan usage. Reconnect and approve it.
                </AlertDescription>
              </Alert>
            ) : null}
            {authorizeUrl ? (
              <ol className="space-y-3 text-sm">
                <li className="space-y-1.5">
                  <p className="text-muted-foreground">
                    1. Open the sign-in on the computer you are using now, and approve access.
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    render={<a href={authorizeUrl} target="_blank" rel="noreferrer noopener" />}
                  >
                    <ExternalLinkIcon className="size-3.5" aria-hidden />
                    Open ChatGPT sign-in
                  </Button>
                </li>
                <li className="space-y-1.5">
                  <Label htmlFor="chatgpt-plan-callback" className="text-muted-foreground">
                    2. The browser then lands on a page that cannot load (127.0.0.1). Copy the whole
                    address from the address bar and paste it here. It is valid for ten minutes.
                  </Label>
                  <Input
                    id="chatgpt-plan-callback"
                    value={pasted}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="http://127.0.0.1:41455/auth/callback?code=..."
                    onChange={(event) => setPasted(event.target.value)}
                  />
                </li>
              </ol>
            ) : null}
            {failure ? (
              <Alert variant="error">
                <TriangleAlertIcon />
                <AlertDescription>{failure}</AlertDescription>
              </Alert>
            ) : null}
          </div>
        }
        actions={
          authorizeUrl ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => {
                  setAuthorizeUrl(null);
                  setFailure(null);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={pasted.trim().length === 0 || complete.isPending}
                onClick={finishSignIn}
              >
                {complete.isPending ? <Spinner className="size-3.5" /> : null}
                Finish connecting
              </Button>
            </>
          ) : connected ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={disconnect.isPending}
              onClick={disconnectPlan}
            >
              <UnplugIcon className="size-3.5" aria-hidden />
              Disconnect
            </Button>
          ) : (
            <Button type="button" size="sm" disabled={start.isPending} onClick={beginSignIn}>
              {start.isPending ? <Spinner className="size-3.5" /> : null}
              {data?.needsReconnect ? "Reconnect ChatGPT" : "Connect ChatGPT"}
            </Button>
          )
        }
      />
    </section>
  );
}
