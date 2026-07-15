import { createStep, createWorkflow } from "@mastra/core/workflows";
import { eq, isNull, lt, or } from "drizzle-orm";
import { z } from "zod";

import { getDb } from "@tsu-stack/db";
import { stackDependency } from "@tsu-stack/db/schema";

const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

const inputSchema = z.object({});
const outputSchema = z.object({
  refreshedCount: z.number()
});

type NpmMetadata = {
  description: string | null;
  version: string | null;
  homepage: string | null;
};

async function fetchNpmMetadata(packageName: string): Promise<NpmMetadata> {
  const registryUrl = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;
  let registryRes: Awaited<ReturnType<typeof fetch>>;
  try {
    registryRes = await fetch(registryUrl);
  } catch {
    return { description: null, version: null, homepage: null };
  }

  let description: string | null = null;
  let version: string | null = null;
  let homepage: string | null = null;

  if (registryRes.ok) {
    const data = (await registryRes.json()) as {
      description?: string;
      "dist-tags"?: { latest?: string };
      homepage?: string;
    };
    description = data.description ?? null;
    version = data["dist-tags"]?.latest ?? null;
    homepage = data.homepage ?? null;
  }

  return { description, version, homepage };
}

const refreshStep = createStep({
  id: "refresh-dependencies",
  description: "Fetches updated npm metadata for stale dependencies",
  inputSchema,
  outputSchema,
  execute: async () => {
    const cutoffDate = new Date(Date.now() - THREE_DAYS_MS);
    const db = getDb();

    const staleDeps = await db
      .select()
      .from(stackDependency)
      .where(
        or(isNull(stackDependency.lastRefreshedAt), lt(stackDependency.lastRefreshedAt, cutoffDate))
      );

    let refreshedCount = 0;

    for (const dep of staleDeps) {
      try {
        const meta = await fetchNpmMetadata(dep.npmPackage);
        const now = new Date();
        await db
          .update(stackDependency)
          .set({
            description: meta.description,
            version: meta.version,
            homepage: meta.homepage,
            lastRefreshedAt: now,
            updatedAt: now
          })
          .where(eq(stackDependency.id, dep.id));
        refreshedCount++;
      } catch (err) {
        console.error(`[refresh-deps] Failed to refresh ${dep.npmPackage}:`, err);
      }
    }

    return { refreshedCount };
  }
});

export const refreshDependenciesWorkflow = createWorkflow({
  id: "refresh-dependencies-workflow",
  inputSchema,
  outputSchema,
  schedule: {
    cron: "0 3 * * *",
    timezone: "UTC"
  }
})
  .then(refreshStep)
  .commit();
