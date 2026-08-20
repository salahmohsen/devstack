import { type OrganizeAction } from "#@/stack/organize-stacks.types";

export type OrganizeStackRef = {
  id: string;
  name: string;
  projectCount?: number;
};

/** Case-insensitive, whitespace-normalized stack name key. */
export function normalizeOrganizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function nonEmpty(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  return trimmed;
}

function firstDefined(...values: Array<string | undefined | null>): string | undefined {
  for (const value of values) {
    const next = nonEmpty(value);
    if (next) return next;
  }
  return undefined;
}

type MutableMerge = {
  type: "merge";
  stackId: string;
  stackName: string;
  details: { mergeIntoId: string; mergeIntoName: string };
  reason: string;
};

type MutableRename = {
  type: "rename";
  stackId: string;
  stackName: string;
  details: { newName: string; alternativeNames?: string[] };
  reason: string;
};

type MutableEnrich = {
  type: "enrich";
  stackId: string;
  stackName: string;
  details: {
    newDescription?: string;
    newIcon?: string;
    newType?: string;
  };
  reason: string;
};

/**
 * Normalize organize actions so apply never hits unique-name collisions:
 * - drop no-op renames (same name)
 * - convert renames to an existing name into merges
 * - convert competing renames to the same target into merges
 * - drop enrich on merge victims
 * - drop empty enrichments
 * - rewrite sortOrder victim ids → survivors
 */
export function normalizeOrganizeActions(
  actions: OrganizeAction[],
  stacks: OrganizeStackRef[],
  sortOrder: string[] = []
): { actions: OrganizeAction[]; sortOrder: string[] } {
  const stackById = new Map(stacks.map((s) => [s.id, s]));
  const nameOwner = new Map<string, OrganizeStackRef>();
  for (const stack of stacks) {
    nameOwner.set(normalizeOrganizeName(stack.name), stack);
  }

  const victimToSurvivor = new Map<string, string>();
  const merges: MutableMerge[] = [];
  const renames: MutableRename[] = [];
  const enrichByStackId = new Map<string, MutableEnrich>();

  // ── Pass 1: explicit merges ───────────────────────────────────────
  for (const action of actions) {
    if (action.type !== "merge") continue;
    const survivorId = action.details.mergeIntoId;
    const survivorName = action.details.mergeIntoName;
    if (!survivorId || survivorId === action.stackId) continue;
    if (victimToSurvivor.has(action.stackId)) continue;

    victimToSurvivor.set(action.stackId, survivorId);
    merges.push({
      type: "merge",
      stackId: action.stackId,
      stackName: action.stackName,
      details: {
        mergeIntoId: survivorId,
        mergeIntoName: survivorName ?? stackById.get(survivorId)?.name ?? "unknown"
      },
      reason: action.reason
    });
  }

  function resolveSurvivor(id: string): string {
    let current = id;
    const seen = new Set<string>();
    while (victimToSurvivor.has(current) && !seen.has(current)) {
      seen.add(current);
      current = victimToSurvivor.get(current)!;
    }
    return current;
  }

  function addMerge(
    victimId: string,
    victimName: string,
    survivorId: string,
    survivorName: string,
    reason: string
  ) {
    if (victimId === survivorId) return;
    if (victimToSurvivor.has(victimId)) return;
    // Never merge survivor into its own victim chain
    if (resolveSurvivor(survivorId) === victimId) return;

    const resolvedSurvivor = resolveSurvivor(survivorId);
    const resolvedName =
      firstDefined(
        survivorName,
        stackById.get(resolvedSurvivor)?.name,
        renames.find((r) => r.stackId === resolvedSurvivor)?.details.newName
      ) ?? "unknown";

    victimToSurvivor.set(victimId, resolvedSurvivor);
    merges.push({
      type: "merge",
      stackId: victimId,
      stackName: victimName,
      details: { mergeIntoId: resolvedSurvivor, mergeIntoName: resolvedName },
      reason
    });

    // Free the victim's name for others; survivor keeps/claims its name
    const victim = stackById.get(victimId);
    if (victim) {
      const key = normalizeOrganizeName(victim.name);
      if (nameOwner.get(key)?.id === victimId) {
        nameOwner.delete(key);
      }
    }
  }

  // ── Pass 2: renames (no-op drop, collision → merge) ───────────────
  // Track names claimed by renames in this batch (normalized → stackId)
  const claimedByRename = new Map<string, { stackId: string; newName: string }>();

  for (const action of actions) {
    if (action.type !== "rename") continue;
    if (victimToSurvivor.has(action.stackId)) continue;

    const newName = action.details.newName?.trim();
    if (!newName) continue;

    const current = stackById.get(action.stackId);
    const currentName = current?.name ?? action.stackName;
    if (normalizeOrganizeName(currentName) === normalizeOrganizeName(newName)) {
      continue; // no-op
    }

    const key = normalizeOrganizeName(newName);

    // Another rename in this batch already claims this name → merge into that stack
    const claimed = claimedByRename.get(key);
    if (claimed && claimed.stackId !== action.stackId) {
      addMerge(
        action.stackId,
        currentName,
        claimed.stackId,
        claimed.newName,
        `Auto-merged: both standardize to "${claimed.newName}"`
      );
      continue;
    }

    // An existing stack already owns this name → merge into it
    const owner = nameOwner.get(key);
    if (owner && owner.id !== action.stackId && !victimToSurvivor.has(owner.id)) {
      addMerge(
        action.stackId,
        currentName,
        owner.id,
        owner.name,
        `Auto-merged: "${newName}" already exists as "${owner.name}"`
      );
      continue;
    }

    // Owner is a merge victim — merge into their survivor instead of renaming
    if (owner && owner.id !== action.stackId && victimToSurvivor.has(owner.id)) {
      const survivorId = resolveSurvivor(owner.id);
      addMerge(
        action.stackId,
        currentName,
        survivorId,
        stackById.get(survivorId)?.name ?? newName,
        `Auto-merged: target name "${newName}" resolves to an existing stack`
      );
      continue;
    }

    claimedByRename.set(key, { stackId: action.stackId, newName });
    // Update name ownership for later renames in this pass
    nameOwner.set(key, {
      id: action.stackId,
      name: newName,
      projectCount: current?.projectCount
    });
    const oldKey = normalizeOrganizeName(currentName);
    if (nameOwner.get(oldKey)?.id === action.stackId && oldKey !== key) {
      nameOwner.delete(oldKey);
    }

    const aliases = action.details.alternativeNames?.filter((name) => name.trim()) ?? [];
    renames.push({
      type: "rename",
      stackId: action.stackId,
      stackName: currentName,
      details: {
        newName,
        ...(aliases.length > 0 ? { alternativeNames: aliases } : {})
      },
      reason: action.reason
    });
  }

  // ── Pass 3: enrich (skip victims, drop empty, fold per stack) ─────
  for (const action of actions) {
    if (action.type !== "enrich") continue;
    if (victimToSurvivor.has(action.stackId)) continue;

    const newDescription = nonEmpty(action.details.newDescription);
    const newIcon = nonEmpty(action.details.newIcon);
    const newType = nonEmpty(action.details.newType);
    if (!newDescription && !newIcon && !newType) continue;

    const existing = enrichByStackId.get(action.stackId);
    if (existing) {
      enrichByStackId.set(action.stackId, {
        ...existing,
        details: {
          newDescription: newDescription ?? existing.details.newDescription,
          newIcon: newIcon ?? existing.details.newIcon,
          newType: newType ?? existing.details.newType
        }
      });
    } else {
      enrichByStackId.set(action.stackId, {
        type: "enrich",
        stackId: action.stackId,
        stackName: action.stackName,
        details: { newDescription, newIcon, newType },
        reason: action.reason
      });
    }
  }

  const normalized: OrganizeAction[] = [
    ...merges,
    ...renames,
    ...Array.from(enrichByStackId.values())
  ];

  // ── Sort order: map victims → survivors, dedupe ───────────────────
  const seenOrder = new Set<string>();
  const normalizedSortOrder: string[] = [];
  for (const id of sortOrder) {
    const resolved = resolveSurvivor(id);
    if (seenOrder.has(resolved)) continue;
    // Drop ids that no longer exist as stacks and aren't survivors we know
    if (!stackById.has(resolved) && !merges.some((m) => m.details.mergeIntoId === resolved)) {
      continue;
    }
    seenOrder.add(resolved);
    normalizedSortOrder.push(resolved);
  }

  return { actions: normalized, sortOrder: normalizedSortOrder };
}
