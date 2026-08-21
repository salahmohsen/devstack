/** Display ceiling when listing min years exceed seeker years (Freehire-style). */
export const YEARS_SCORE_CEILING = 65;

export function applyYearsCap(input: {
  aiScore: number;
  listingMinYears: number | null | undefined;
  seekerYears: number | null | undefined;
}): { landScore: number; displayScore: number; capped: boolean } {
  const landScore = input.aiScore;
  const listing = input.listingMinYears;
  const seeker = input.seekerYears;
  if (listing == null || seeker == null || listing <= seeker) {
    return { landScore, displayScore: landScore, capped: false };
  }
  return {
    landScore,
    displayScore: Math.min(landScore, YEARS_SCORE_CEILING),
    capped: true
  };
}
