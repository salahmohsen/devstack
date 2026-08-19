"use client";

import { Group, GroupSeparator } from "@tsu-stack/ui/components/group";

import { useFindJobsNowJob } from "@/shared/lib/find-jobs-now-store";

import { ScanJobAlertsButton, useScanJobAlertsJob } from "@/features/applications";
import { FindJobsNowButton } from "@/features/job-discovery";

/**
 * Find jobs ± Scan mail. Idle: one primary Group. While either job runs, the
 * running trigger pulls out (same pattern as Organize in HeaderActions) so the
 * white loading chrome is not flattened into the neighbor.
 */
export function NewJobsDiscoveryActions({ importFromEmail }: { importFromEmail: boolean }) {
  const findRunning = useFindJobsNowJob().status === "running";
  const scanRunning = useScanJobAlertsJob().status === "running";

  if (!importFromEmail) {
    return <FindJobsNowButton />;
  }

  // Running trigger owns its own Group (status + cancel). Keep siblings outside
  // any parent Group so radii / separators are not flattened into the loader.
  if (findRunning || scanRunning) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <FindJobsNowButton />
        <ScanJobAlertsButton />
      </div>
    );
  }

  return (
    <Group>
      <FindJobsNowButton />
      <GroupSeparator />
      <ScanJobAlertsButton />
    </Group>
  );
}
