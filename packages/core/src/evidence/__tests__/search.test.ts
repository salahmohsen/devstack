import { describe, expect, it } from "vitest";

import { rankEvidenceHits, type EvidenceSearchRow } from "#@/evidence/search";

function row(id: string, title: string, oneLiner = "snippet"): EvidenceSearchRow {
  return { id, title, oneLiner };
}

describe("rankEvidenceHits", () => {
  it("ranks exact title above prefix above substring", () => {
    const hits = rankEvidenceHits({
      query: "raya",
      rows: [
        row("sub", "Senior Frontend @ RAYA", "substring"),
        row("exact", "RAYA", "exact"),
        row("prefix", "RAYA Holdings", "prefix"),
        row("none", "Other Co", "raya only in the description")
      ]
    });

    expect(hits.map((hit) => hit.id)).toEqual(["exact", "prefix", "sub"]);
  });

  it("matches the title only, including org baked into the title", () => {
    const rows = [row("raya", "Senior Frontend @ RAYA", "ACME is mentioned only in the one-liner")];

    expect(rankEvidenceHits({ query: "RAYA", rows }).map((hit) => hit.id)).toEqual(["raya"]);
    expect(rankEvidenceHits({ query: "ACME", rows })).toEqual([]);
  });

  it("matches curly apostrophes in org names against ASCII queries", () => {
    const rows = [row("ment", "Senior Frontend Engineer @ Ment\u2019ech", "workplace")];
    expect(rankEvidenceHits({ query: "Ment'ech", rows }).map((hit) => hit.id)).toEqual(["ment"]);
    expect(rankEvidenceHits({ query: "Ment\u2019ech", rows }).map((hit) => hit.id)).toEqual([
      "ment"
    ]);
  });

  it("caps results at 8 by default", () => {
    const rows = Array.from({ length: 12 }, (_, index) =>
      row(`p${String(index).padStart(2, "0")}`, `Dev Hub ${index}`)
    );
    const hits = rankEvidenceHits({ query: "dev", rows });
    expect(hits).toHaveLength(8);
  });

  it("returns [] for an empty or whitespace query", () => {
    const rows = [row("1", "Dev-Hub")];
    expect(rankEvidenceHits({ query: "", rows })).toEqual([]);
    expect(rankEvidenceHits({ query: "   ", rows })).toEqual([]);
  });

  it("truncates oneLiner to the first 120 chars of the first line", () => {
    const longLine = `${"x".repeat(200)}\nfull description dump that must not appear`;
    const [hit] = rankEvidenceHits({
      query: "Dev-Hub",
      rows: [row("1", "Dev-Hub", longLine)]
    });

    expect(hit?.oneLiner).toBe("x".repeat(120));
    expect(hit?.oneLiner.length).toBeLessThanOrEqual(120);
    expect(hit?.oneLiner).not.toContain("full description");
    expect(hit?.oneLiner).not.toContain("\n");
  });
});
