/**
 * One-shot request to open the dashboard hub floater after a landing
 * navigation (JD save/package → tracked jobs) or a list-`+` create interview.
 */
export type HubCreateIntent = "project" | "experience" | "stack";

let pendingOpen = false;
let pendingCreateKind: HubCreateIntent | null = null;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function requestOpenHubAssistant() {
  pendingOpen = true;
  emit();
}

export function requestHubCreateInterview(kind: HubCreateIntent) {
  requestOpenHubAssistant();
  pendingCreateKind = kind;
  emit();
}

export function consumeOpenHubAssistant(): boolean {
  if (!pendingOpen) return false;
  pendingOpen = false;
  emit();
  return true;
}

/** Take the create kind only. Never consumes the floater open flag. */
export function consumeHubCreateIntent(): HubCreateIntent | null {
  if (!pendingCreateKind) return null;
  const kind = pendingCreateKind;
  pendingCreateKind = null;
  emit();
  return kind;
}

export function subscribeHubAssistantOpen(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const subscribeHubCreateIntent = subscribeHubAssistantOpen;

export function getHubAssistantOpenPending() {
  return pendingOpen;
}

export function getHubCreateIntent() {
  return pendingCreateKind;
}

export function hubCreateInterviewText(kind: HubCreateIntent): string {
  if (kind === "project") return "I want to add a new project.";
  if (kind === "experience") return "I want to add a new experience.";
  return "I want to add a new stack.";
}

export function resetHubAssistantOpenForTests() {
  pendingOpen = false;
  pendingCreateKind = null;
  emit();
}
