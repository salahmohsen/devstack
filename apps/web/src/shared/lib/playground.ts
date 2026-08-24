import { notFound } from "@tanstack/react-router";

/** Playground routes and commands ship in the repo for local work only. */
export const isPlaygroundEnabled = import.meta.env.DEV;

const PLAYGROUND_COMMAND_IDS = new Set(["nav:playground", "nav:playground-agent"]);

export function isPlaygroundCommandId(id: string): boolean {
  return PLAYGROUND_COMMAND_IDS.has(id);
}

/** Throw a 404 when playground is disabled (production / preview builds). */
export function assertPlaygroundEnabled(): void {
  if (!isPlaygroundEnabled) {
    throw notFound();
  }
}
