export const SILENCE_NUDGE_MS = 7 * 24 * 60 * 60 * 1000;
export const SILENCE_GHOST_MS = 14 * 24 * 60 * 60 * 1000;

export type SilencePhase = "quiet" | "nudge7" | "suggestGhost14";

export function silencePhase(input: {
  now: Date;
  stageChangedAt: Date;
  lastLinkedMailAt: Date | null;
  lastSilenceNudgeAt: Date | null;
  lastGhostSuggestAt: Date | null;
}): SilencePhase {
  const clockStart = Math.max(
    input.stageChangedAt.getTime(),
    input.lastLinkedMailAt?.getTime() ?? 0
  );
  const quietFor = input.now.getTime() - clockStart;
  if (quietFor < SILENCE_NUDGE_MS) return "quiet";
  if (quietFor >= SILENCE_GHOST_MS && input.lastGhostSuggestAt == null) {
    return "suggestGhost14";
  }
  if (input.lastSilenceNudgeAt == null) return "nudge7";
  return "quiet";
}
