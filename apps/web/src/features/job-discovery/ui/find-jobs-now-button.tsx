"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";

import { AiFlowTrigger } from "@/shared/ui/ai-flow-trigger";

import {
  dismissFindJobsNowTracking,
  startFindJobsNow
} from "@/features/job-discovery/api/find-jobs-now-job";
import { useFindJobsNowJob } from "@/features/job-discovery/lib/find-jobs-now-store";

export function FindJobsNowButton({ className }: { className?: string }) {
  const queryClient = useQueryClient();
  const { status, stepLabel } = useFindJobsNowJob();

  return (
    <AiFlowTrigger
      idleLabel="Find jobs now"
      icon={<SearchIcon aria-hidden />}
      running={status === "running"}
      stepLabel={stepLabel}
      runningFallback="Finding jobs…"
      onStart={() => {
        void startFindJobsNow(queryClient);
      }}
      onCancel={dismissFindJobsNowTracking}
      size="default"
      layout="default"
      className={className}
    />
  );
}
