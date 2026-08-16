import { type LevelFloor } from "./types";

const LEVEL_RANK: Record<LevelFloor, number> = {
  junior: 0,
  mid: 1,
  senior: 2,
  staff: 3
};

const TOKEN_LEVEL: Record<string, LevelFloor> = {
  intern: "junior",
  junior: "junior",
  jr: "junior",
  associate: "junior",
  mid: "mid",
  midlevel: "mid",
  senior: "senior",
  sr: "senior",
  staff: "staff",
  principal: "staff",
  distinguished: "staff"
};

function titleTokens(title: string): string[] {
  return title
    .toLowerCase()
    .replace(/[._/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((token) => token.length > 0);
}

/** Highest known rank in the title. `lead` alone is unknown in v1. */
export function inferTitleSeniority(title: string): LevelFloor | null {
  let best: LevelFloor | null = null;
  for (const token of titleTokens(title)) {
    const level = TOKEN_LEVEL[token];
    if (!level) continue;
    if (best == null || LEVEL_RANK[level] > LEVEL_RANK[best]) best = level;
  }
  return best;
}

export function isBelowLevelFloor(title: string, floor: LevelFloor | null | undefined): boolean {
  if (floor == null) return false;
  const seniority = inferTitleSeniority(title);
  if (seniority == null) return false;
  return LEVEL_RANK[seniority] < LEVEL_RANK[floor];
}
