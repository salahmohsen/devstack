import { type OrpcContext } from "@tsu-stack/core";
import { resumeRepository } from "@tsu-stack/db/repositories";

import { requireResumeSourceObjectKey } from "#@/lib/onboarding/object-key";

function sanitizeResumeFilename(filename: string | undefined): string {
  const raw = filename?.trim() ?? "uploaded-resume.pdf";
  const withExt = raw.toLowerCase().endsWith(".pdf") ? raw : `${raw}.pdf`;
  const cleaned = withExt.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
  const trimmed = cleaned.slice(0, 120).replace(/^[._-]+|[._-]+$/g, "");
  return trimmed.length > 0 ? trimmed : "uploaded-resume.pdf";
}

/**
 * Promote a session onboarding resume-source PDF into the permanent resumes
 * inventory as the new default. Copies object to `resumes/…`, creates the DB
 * row, sets default, then deletes the temporary source key.
 *
 * Throws on failure so the caller can decide whether to surface or swallow.
 */
export async function promoteResumeSourceToDefault(options: {
  mediaBucket: OrpcContext["mediaBucket"];
  userId: string;
  objectKey: string;
  filename?: string;
}): Promise<{ id: string; filename: string; r2Key: string }> {
  const { mediaBucket, userId, objectKey, filename } = options;
  const sourceKey = requireResumeSourceObjectKey(objectKey, userId);

  const object = await mediaBucket.get(sourceKey);
  if (!object?.body) {
    throw new Error("Resume source object not found");
  }

  const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
  const displayFilename = sanitizeResumeFilename(filename);
  const r2Key = `resumes/${crypto.randomUUID()}-${displayFilename}`;

  await mediaBucket.put(r2Key, bytes.slice().buffer as ArrayBuffer, {
    httpMetadata: { contentType: "application/pdf" }
  });

  const created = await resumeRepository.create({
    prompt: null,
    author: "admin",
    filename: displayFilename,
    r2Key
  });

  await resumeRepository.setDefault(created.id);

  try {
    await mediaBucket.delete(sourceKey);
  } catch {
    // Permanent resume is stored; orphaned session source is acceptable.
  }

  return { id: created.id, filename: displayFilename, r2Key };
}
