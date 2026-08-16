export type HubComposerModelChoice = {
  modelId: string;
  providerId: string;
};

const STORAGE_KEY = "tsu.hub.composer.model";

let current: HubComposerModelChoice | null = null;

function readStored(): HubComposerModelChoice | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<HubComposerModelChoice>;
    if (typeof parsed.modelId !== "string" || parsed.modelId.length === 0) return null;
    if (typeof parsed.providerId !== "string" || parsed.providerId.length === 0) return null;
    return { modelId: parsed.modelId, providerId: parsed.providerId };
  } catch {
    return null;
  }
}

export function getHubComposerModel(): HubComposerModelChoice | null {
  if (current) return current;
  current = readStored();
  return current;
}

export function setHubComposerModel(choice: HubComposerModelChoice | null) {
  current = choice;
  if (typeof sessionStorage === "undefined") return;
  try {
    if (choice) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
    else sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // private mode
  }
}
