import { type EvidenceKind, type EvidenceSearchRow } from "@tsu-stack/core";

/** Tenant evidence fields needed to build ranked search rows. */
export type EvidenceSearchSourceRow = {
  id: string;
  title?: string | null;
  organization?: string | null;
  name?: string | null;
  summary?: string | null;
  description?: string | null;
  type?: string | null;
};

const ONE_LINER_MAX = 120;

function snippet(value: string | null | undefined): string {
  if (!value) return "";
  const firstLine = value.split(/\r?\n/, 1)[0] ?? "";
  return firstLine.slice(0, ONE_LINER_MAX);
}

/**
 * Map a tenant row into a rankable hit.
 * Experience title includes organization so org queries (e.g. RAYA) match.
 */
export function toEvidenceSearchRow(
  kind: EvidenceKind,
  row: EvidenceSearchSourceRow
): EvidenceSearchRow {
  switch (kind) {
    case "project":
      return {
        id: row.id,
        title: row.title ?? "",
        oneLiner: snippet(row.summary)
      };
    case "experience":
      return {
        id: row.id,
        title: `${row.title ?? ""} @ ${row.organization ?? ""}`,
        oneLiner: snippet(row.description)
      };
    case "stack":
      return {
        id: row.id,
        title: row.name ?? "",
        oneLiner: snippet(row.description) || (row.type ?? "")
      };
  }
}

export function toEvidenceSearchRows(
  kind: EvidenceKind,
  rows: readonly EvidenceSearchSourceRow[]
): EvidenceSearchRow[] {
  return rows.map((row) => toEvidenceSearchRow(kind, row));
}
