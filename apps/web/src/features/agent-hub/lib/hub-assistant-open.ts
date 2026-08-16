/**
 * One-shot request to open the dashboard hub floater after a landing
 * navigation (JD save/package → tracked jobs).
 */
let pendingOpen = false;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function requestOpenHubAssistant() {
  pendingOpen = true;
  emit();
}

export function consumeOpenHubAssistant(): boolean {
  if (!pendingOpen) return false;
  pendingOpen = false;
  emit();
  return true;
}

export function subscribeHubAssistantOpen(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getHubAssistantOpenPending() {
  return pendingOpen;
}
