/**
 * Cross-layer handoff: hub toolkit (features) queues Prepare; layout host
 * (pages) starts generate. Avoids features → pages imports.
 */
type Listener = () => void;

const listeners = new Set<Listener>();
let pendingApplicationId: string | null = null;

function emit() {
  for (const listener of listeners) listener();
}

export function requestPreparePackageHandoff(applicationId: string): void {
  pendingApplicationId = applicationId;
  emit();
}

export function getPreparePackageHandoffId(): string | null {
  return pendingApplicationId;
}

export function consumePreparePackageHandoffId(): string | null {
  const id = pendingApplicationId;
  pendingApplicationId = null;
  return id;
}

export function subscribePreparePackageHandoff(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
