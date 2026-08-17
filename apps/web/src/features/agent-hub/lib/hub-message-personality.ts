import {
  DEFAULT_HUB_PERSONALITY,
  hubPersonalityById,
  parseHubPersonalityId,
  type HubPersonalityId
} from "@tsu-stack/core";

const STORAGE_KEY = "tsu.hub.message.personality";

const remembered = new Map<string, HubPersonalityId>();
let loaded = false;

function load(): void {
  if (loaded) return;
  loaded = true;
  if (typeof localStorage === "undefined") return;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    for (const [id, value] of Object.entries(parsed)) {
      if (typeof value === "string" && id.length > 0) {
        remembered.set(id, hubPersonalityById(value).id);
      }
    }
  } catch {
    // ignore
  }
}

function persist(): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(remembered)));
  } catch {
    // private mode
  }
}

/** First write wins so hydrate cannot overwrite a stamped reply. */
export function rememberHubMessagePersonality(messageId: string, personality: HubPersonalityId) {
  if (!messageId) return;
  load();
  if (remembered.has(messageId)) return;
  remembered.set(messageId, hubPersonalityById(personality).id);
  persist();
}

export function hubPersonalityFromMetadata(metadata: unknown): HubPersonalityId | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  return parseHubPersonalityId((metadata as { hubPersonality?: unknown }).hubPersonality);
}

export function hubMessagePersonality(
  messageId: string | null | undefined,
  metadata?: unknown
): HubPersonalityId {
  const fromMeta = hubPersonalityFromMetadata(metadata);
  if (fromMeta) return fromMeta;
  if (!messageId) return DEFAULT_HUB_PERSONALITY;
  load();
  return remembered.get(messageId) ?? DEFAULT_HUB_PERSONALITY;
}
