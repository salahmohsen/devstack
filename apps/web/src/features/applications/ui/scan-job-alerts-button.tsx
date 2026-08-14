"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MailSearchIcon } from "lucide-react";

import { AiFlowTrigger } from "@/shared/ui/ai-flow-trigger";

import {
  dismissScanJobAlertsTracking,
  startScanJobAlerts
} from "@/features/applications/api/scan-job-alerts-job";
import { useScanJobAlertsJob } from "@/features/applications/lib/scan-job-alerts-store";

export function ScanJobAlertsButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { status, stepLabel } = useScanJobAlertsJob();

  return (
    <AiFlowTrigger
      idleLabel="Scan job alerts"
      icon={<MailSearchIcon aria-hidden />}
      running={status === "running"}
      stepLabel={stepLabel}
      runningFallback="Scanning job alerts…"
      onStart={() => {
        void startScanJobAlerts(queryClient);
      }}
      onCancel={dismissScanJobAlertsTracking}
      size="default"
      layout="default"
      className={className}
    />
  );
}
