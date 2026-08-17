import { type ProposeNewJobsTriageOutput } from "@tsu-stack/core";

const STORAGE_KEY = "hub.triage-card-actions.v1";

type StoredAction = ProposeNewJobsTriageOutput["action"];

function readMap(): Record<string, StoredAction> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return parsed as Record<string, StoredAction>;
  } catch {
    return {};
  }
}

export function rememberTriageAction(toolCallId: string, action: StoredAction): void {
  if (toolCallId.length === 0 || typeof localStorage === "undefined") return;
  const next = readMap();
  next[toolCallId] = action;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
}

export function recalledTriageAction(toolCallId: string): StoredAction | null {
  if (toolCallId.length === 0) return null;
  const action = readMap()[toolCallId];
  return action === "confirm" || action === "cancel" ? action : null;
}
