const abandonedIds = new Set<string>();
const listeners = new Set<() => void>();
let remountSeen = false;

function emit(): void {
  for (const listener of listeners) listener();
}

/** History hydrate finished — pending Confirm cards from the last session are dead. */
export function markHubHitlRemountSeen(): void {
  if (remountSeen) return;
  remountSeen = true;
  emit();
}

export function didHubHitlRemount(): boolean {
  return remountSeen;
}

/** History hydrate abandoned these Confirm cards — they must not stay actionable. */
export function markHubHitlAbandonedOnRemount(ids: readonly string[]): void {
  let changed = false;
  markHubHitlRemountSeen();
  for (const id of ids) {
    if (!id || abandonedIds.has(id)) continue;
    abandonedIds.add(id);
    changed = true;
  }
  if (changed) emit();
}

export function isHubHitlAbandonedOnRemount(toolCallId: string): boolean {
  return toolCallId.length > 0 && abandonedIds.has(toolCallId);
}

export function subscribeHubHitlRemount(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
