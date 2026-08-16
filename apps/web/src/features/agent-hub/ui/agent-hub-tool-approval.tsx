import { Button } from "@tsu-stack/ui/components/button";

import { summarizeHubApproval } from "@/features/agent-hub/lib/hub-approval-summary";

import { HubHitlFrame } from "./hub-hitl-frame";

type AgentHubToolApprovalProps = {
  toolName: string;
  args: Record<string, unknown>;
  onApprove: () => void;
  onDecline: () => void;
  isPending?: boolean;
};

/**
 * HITL approval card for requireToolApproval tools.
 * Progressive warning Alert / confirm via HubHitlFrame — not a modal.
 */
export function AgentHubToolApproval({
  toolName,
  args,
  onApprove,
  onDecline,
  isPending = false
}: AgentHubToolApprovalProps) {
  const summary = summarizeHubApproval(toolName, args);

  return (
    <HubHitlFrame
      kind={summary.kind}
      title={summary.title}
      description={summary.body}
      submitting={isPending}
      footer={
        <>
          <Button size="sm" onClick={onApprove} disabled={isPending} loading={isPending} autoFocus>
            {summary.primaryLabel}
          </Button>
          <Button variant="destructive" size="sm" onClick={onDecline} disabled={isPending}>
            {summary.secondaryLabel}
          </Button>
        </>
      }
    />
  );
}
