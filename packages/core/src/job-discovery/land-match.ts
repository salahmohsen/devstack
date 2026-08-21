/**
 * Server-owned pass/fail after two-axis. The model may emit `passed: false`
 * with a score already at or above the bar (invented location/level kills).
 * Column hard-fails are applied before this helper.
 */
export function resolveMatchLandDecision(input: {
  minScore: number;
  passAll?: boolean;
  aiScore: number;
}): { score: number; passed: boolean } {
  const score = Math.max(0, Math.min(100, Math.round(input.aiScore)));
  if (input.passAll) return { score, passed: true };
  return { score, passed: score >= input.minScore };
}
