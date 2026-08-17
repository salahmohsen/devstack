import {
  DEFAULT_HUB_PERSONALITY,
  hubPersonalityById,
  type HubPersonalityId
} from "@tsu-stack/core";

const STORAGE_KEY = "tsu.hub.composer.personality";

let current: HubPersonalityId | null = null;
const listeners = new Set<() => void>();

export function subscribeHubComposerPersonality(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

function readStored(): HubPersonalityId | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return hubPersonalityById(raw).id;
  } catch {
    return null;
  }
}

export function getHubComposerPersonality(): HubPersonalityId {
  if (current) return current;
  current = readStored();
  return current ?? DEFAULT_HUB_PERSONALITY;
}

export function setHubComposerPersonality(id: HubPersonalityId | null) {
  current = id ? hubPersonalityById(id).id : null;
  if (typeof sessionStorage !== "undefined") {
    try {
      if (current) sessionStorage.setItem(STORAGE_KEY, current);
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // private mode
    }
  }
  for (const listener of listeners) listener();
}
