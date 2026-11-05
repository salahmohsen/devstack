export const DISCOVERY_FETCH_POOL_SIZE = 100;
/** Per-user `user_job` rows older than this are pruned. */
export const USER_JOB_TTL_MS = 30 * 24 * 60 * 60 * 1000;
/** Fetch-pool activity window: users with runs inside it stay on the tick rotation. */
export const DISCOVERY_ACTIVITY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export const DEFAULT_DAILY_BOARD_SCORE_CAP = 50;
export const MIN_DAILY_BOARD_SCORE_CAP = 20;
export const MAX_DAILY_BOARD_SCORE_CAP = 100;
export const DAILY_BOARD_SCORE_CAP_STEP = 10;
export const MAX_OPEN_INBOX = 50;
export const INBOX_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INBOX_TICK_INTERVAL_MS = 12 * 60 * 60 * 1000;
export const INBOX_TICK_BATCH = 100;

/** Snap to 20/30/…/100 (nearest step, clamped). */
export function refineDailyBoardScoreCap(n: number): number {
  const clamped = Math.min(MAX_DAILY_BOARD_SCORE_CAP, Math.max(MIN_DAILY_BOARD_SCORE_CAP, n));
  const stepsFromMin = Math.round(
    (clamped - MIN_DAILY_BOARD_SCORE_CAP) / DAILY_BOARD_SCORE_CAP_STEP
  );
  const snapped = MIN_DAILY_BOARD_SCORE_CAP + stepsFromMin * DAILY_BOARD_SCORE_CAP_STEP;
  return Math.min(MAX_DAILY_BOARD_SCORE_CAP, Math.max(MIN_DAILY_BOARD_SCORE_CAP, snapped));
}

/** Daily board-score attempts. Value comes from Jobs settings, not the fetch pool size. */
export function dailyAiAttemptCap(dailyBoardScoreCap: number): number {
  return refineDailyBoardScoreCap(dailyBoardScoreCap);
}

export const DISCOVERY_SALARY_NOTE =
  "Monthly and yearly pay are compared in the same currency. Unknown pay, other currencies, and hourly or daily rates stay eligible.";

export const DISCOVERY_AI_FALLBACK_NOTE =
  "AI scoring was unavailable. Matches were added using your saved filters.";

export const DISCOVERY_NO_AI_NOTE =
  "Matches were added using your saved filters without AI scoring. Add an AI key in Settings for personalized scoring.";
