export type ApplyKitReplaceFailureStage = "put" | "commit";

export type ApplyKitReplaceSteps = {
  /** PUT new resume + cover objects. Must not touch the old kit. */
  putNew: () => Promise<void>;
  /** Create the new resume row and point the application at the new keys. */
  commitDb: () => Promise<void>;
  /** Best-effort delete of the previous kit. Never throws to the caller. */
  deleteOldBestEffort: () => Promise<void>;
  /** Best-effort delete of orphan new objects/rows after a failed PUT or commit. */
  deleteNewBestEffort: () => Promise<void>;
};

export type ApplyKitReplaceResult =
  | { ok: true }
  | { ok: false; stage: ApplyKitReplaceFailureStage; error: unknown };

/**
 * Write-new-first kit replace. Fail closed: leave the old kit if PUT or DB commit fails.
 * Old-object delete is best-effort after a successful commit — do not treat it as an error.
 */
export async function runFailClosedApplyKitReplace(
  steps: ApplyKitReplaceSteps
): Promise<ApplyKitReplaceResult> {
  try {
    await steps.putNew();
  } catch (error) {
    try {
      await steps.deleteNewBestEffort();
    } catch {
      // orphan new objects are best-effort
    }
    return { ok: false, stage: "put", error };
  }

  try {
    await steps.commitDb();
  } catch (error) {
    try {
      await steps.deleteNewBestEffort();
    } catch {
      // orphan new objects/rows are best-effort
    }
    return { ok: false, stage: "commit", error };
  }

  try {
    await steps.deleteOldBestEffort();
  } catch {
    // successful replace; old-object delete is best-effort
  }
  return { ok: true };
}
