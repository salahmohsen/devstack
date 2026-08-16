"use client";

import { useQueryClient } from "@tanstack/react-query";
import { SearchIcon } from "lucide-react";

import { dismissFindJobsNowTracking, startFindJobsNow } from "@/shared/lib/find-jobs-now-job";
import { useFindJobsNowJob } from "@/shared/lib/find-jobs-now-store";
import { AiFlowTrigger } from "@/shared/ui/ai-flow-trigger";

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
