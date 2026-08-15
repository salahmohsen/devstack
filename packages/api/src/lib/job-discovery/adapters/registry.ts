import { type JobAdapterId, type JobSourceAdapter } from "@tsu-stack/core";

import { arbeitnowAdapter } from "./arbeitnow";
import { freehireAdapter } from "./freehire";
import { himalayasAdapter } from "./himalayas";
import { remoteokAdapter } from "./remoteok";
import { remotiveAdapter } from "./remotive";

export const jobSourceAdapters: Record<JobAdapterId, JobSourceAdapter> = {
  freehire: freehireAdapter,
  himalayas: himalayasAdapter,
  arbeitnow: arbeitnowAdapter,
  remotive: remotiveAdapter,
  remoteok: remoteokAdapter
};

export function getJobSourceAdapter(id: JobAdapterId): JobSourceAdapter {
  return jobSourceAdapters[id];
}
