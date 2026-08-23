export type EvidenceSearchRow = {
  id: string;
  title: string;
  oneLiner: string;
  kind?: "project" | "experience" | "stack";
};

const DEFAULT_LIMIT = 8;
const ONE_LINER_MAX = 120;

/** Fold curly/smart quotes so "Ment'ech" matches stored "Ment’ech". */
function normalizeEvidenceText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC\u2032]/g, "'")
    .replace(/[\u201C\u201D]/g, '"');
}

export function rankEvidenceHits(input: {
  query: string;
  rows: EvidenceSearchRow[];
  limit?: number;
}): EvidenceSearchRow[] {
  const query = normalizeEvidenceText(input.query.trim());
  if (!query) return [];

  const scored = input.rows.flatMap((row) => {
    const title = normalizeEvidenceText(row.title);
    const score = scoreTitle(title, query);
    if (score === 0) return [];
    return [{ score, row: { ...row, oneLiner: formatEvidenceOneLiner(row.oneLiner) } }];
  });

  scored.sort(
    (left, right) => right.score - left.score || left.row.title.localeCompare(right.row.title)
  );
  return scored.slice(0, input.limit ?? DEFAULT_LIMIT).map((item) => item.row);
}

function scoreTitle(title: string, query: string): number {
  if (title === query) return 3;
  if (title.startsWith(query)) return 2;
  if (title.includes(query)) return 1;
  return 0;
}

function formatEvidenceOneLiner(value: string): string {
  const firstLine = value.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.slice(0, ONE_LINER_MAX);
}
