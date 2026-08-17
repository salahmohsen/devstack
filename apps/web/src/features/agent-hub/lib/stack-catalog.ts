import { normalizeStackType, STACK_TYPE_LABELS, STACK_TYPE_ORDER } from "@tsu-stack/core";

export type HubStackRow = {
  id: string;
  name: string;
  type: string | null;
  projectCount: number;
  featured: boolean;
  inPortfolio: boolean;
};

export function parseListStacksResult(result: unknown): HubStackRow[] {
  if (!result || typeof result !== "object") return [];
  const list = (result as { stacks?: unknown }).stacks;
  if (!Array.isArray(list)) return [];
  return list.flatMap((item) => {
    const row = parseStackRow(item);
    return row ? [row] : [];
  });
}

function parseStackRow(item: unknown): HubStackRow | null {
  if (!item || typeof item !== "object") return null;
  const rec = item as Record<string, unknown>;
  const name = typeof rec.name === "string" ? rec.name.trim() : "";
  if (!name) return null;
  const id = typeof rec.id === "string" && rec.id.length > 0 ? rec.id : name;
  return {
    id,
    name,
    type: typeof rec.type === "string" && rec.type.trim() ? rec.type.trim() : null,
    projectCount: typeof rec.projectCount === "number" ? rec.projectCount : 0,
    featured: rec.featured === true,
    inPortfolio: rec.inPortfolio === true
  };
}

export function groupHubStacksByType(rows: readonly HubStackRow[]): Array<{
  type: string;
  stacks: HubStackRow[];
}> {
  const byType = new Map<string, HubStackRow[]>();
  for (const row of rows) {
    const type = normalizeStackType(row.type);
    const list = byType.get(type) ?? [];
    list.push(row);
    byType.set(type, list);
  }
  const sortRows = (list: HubStackRow[]) =>
    [...list].toSorted((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return b.projectCount - a.projectCount || a.name.localeCompare(b.name);
    });
  const groups: Array<{ type: string; stacks: HubStackRow[] }> = [];
  const seen = new Set<string>();
  for (const type of STACK_TYPE_ORDER) {
    const list = byType.get(type);
    if (!list?.length) continue;
    seen.add(type);
    groups.push({ type: STACK_TYPE_LABELS[type] ?? type, stacks: sortRows(list) });
  }
  for (const [type, list] of byType) {
    if (seen.has(type) || list.length === 0) continue;
    groups.push({ type: STACK_TYPE_LABELS[type] ?? type, stacks: sortRows(list) });
  }
  return groups;
}
