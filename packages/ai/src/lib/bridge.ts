import { type MastraMemory } from "@mastra/core/memory";

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
 * The `MastraMemory.updateWorkingMemory` API requires a `threadId` (the
 * resource scope means working memory is shared across threads for the same
 * resource, but the API still requires a thread to anchor the write). The
 * `resourceId` identifies which resource's working memory to update.
 *
 * The argument is typed as `MastraMemory` (the abstract base class) so this
 * helper works for any concrete implementation, including the `Memory` class
 * from `@mastra/memory` and the value returned by `mastra.getMemory(...)`.
 */
export async function renderIdentityToWorkingMemory(
  memory: MastraMemory,
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
