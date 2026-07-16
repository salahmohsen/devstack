import { resolveIconForPackage } from "@tsu-stack/core";

export async function batchResolveIcons(
  items: Array<{ stackId: string; stackName: string }>,
  concurrency = 3
): Promise<Array<{ stackId: string; stackName: string; svg: string | null }>> {
  const results: Array<{ stackId: string; stackName: string; svg: string | null }> = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.allSettled(
      batch.map(async (item) => {
        const svg = await resolveIconForPackage(item.stackName);
        return { stackId: item.stackId, stackName: item.stackName, svg };
      })
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }
  return results;
}
