import { type Memory } from "@mastra/memory";

import {
  renderIdentityTemplate,
  type FacetKey,
  type IdentityFacet
} from "@tsu-stack/core/identity";
import { identityRepository } from "@tsu-stack/db/repositories";

/**
 * Re-render the identity facets into a single markdown string suitable for
 * Mastra's working memory template. Returns the rendered markdown and also
 * writes it to the given memory instance's working memory for the given
 * thread/resource.
 *
 * The `Memory.updateWorkingMemory` API in `@mastra/memory@1.21.0` requires
 * a `threadId` (the resource scope means working memory is shared across
 * threads for the same resource, but the API still requires a thread to
 * anchor the write). The `resourceId` identifies which resource's working
 * memory to update.
 */
export async function renderIdentityToWorkingMemory(
  memory: Memory,
  input: { resourceId: string; threadId: string }
): Promise<string> {
  const facets = await identityRepository.listFacets();
  const byKey = new Map<FacetKey, IdentityFacet>(facets.map((f) => [f.key, f]));
  const md = renderIdentityTemplate({
    headline: byKey.get("headline"),
    bio: byKey.get("bio"),
    focus_log: byKey.get("focus_log"),
    narrative: byKey.get("narrative")
  });

  await memory.updateWorkingMemory({
    threadId: input.threadId,
    resourceId: input.resourceId,
    workingMemory: md
  });

  return md;
}
