import { Check, ShieldAlert, X } from "lucide-react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import { Button } from "@tsu-stack/ui/components/button";

type AgentHubToolApprovalProps = {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDecline: () => void;
  isPending?: boolean;
};

/**
 * Sticky HITL approval banner. Warning Alert + actions — progressive,
 * not a modal (product register: exhaust inline alternatives first).
 */
export function AgentHubToolApproval({
  toolName,
  args,
  onApprove,
  onDecline,
  isPending = false
}: AgentHubToolApprovalProps) {
  const argEntries = Object.entries(args);
  const hasArgs = argEntries.length > 0;

  return (
    <Alert
      variant="warning"
      className="mx-auto w-full max-w-3xl"
      role="alertdialog"
      aria-label="Tool approval required"
    >
      <ShieldAlert aria-hidden />
      <AlertTitle>Approval required</AlertTitle>
      <AlertDescription className="gap-2">
        <p className="m-0">
          The hub wants to run{" "}
          <span className="font-mono text-xs font-medium text-foreground">{toolName}</span>. Review
          the arguments before continuing.
        </p>
        {hasArgs ? (
          <pre className="max-h-28 overflow-auto rounded-lg border border-border/60 bg-background/80 p-2 font-mono text-xs text-muted-foreground">
            {JSON.stringify(args, null, 2)}
          </pre>
        ) : null}
      </AlertDescription>
      <AlertAction>
        <Button size="sm" onClick={onApprove} disabled={isPending} loading={isPending}>
          <Check className="size-3.5" aria-hidden />
          Approve
        </Button>
        <Button variant="outline" size="sm" onClick={onDecline} disabled={isPending}>
          <X className="size-3.5" aria-hidden />
          Decline
        </Button>
      </AlertAction>
    </Alert>
  );
}
