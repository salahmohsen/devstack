export type CheapScoreResult = {
  /** 0–100 heuristic rank; not compared to minMatchScore. */
  score: number;
  /** false only for exclude / no title hit / garbage — eligible to land/rank. */
  passed: boolean;
  reasons: string[];
};
