import { describe, expect, it } from "vitest";

import { extraPassCreateLimit, selectListingsToLand } from "#@/lib/job-discovery/land";

describe("selectListingsToLand", () => {
  it("takes the highest cheap scores up to toLand", () => {
    const picked = selectListingsToLand(
      [
        { id: "a", score: 40 },
        { id: "b", score: 80 },
        { id: "c", score: 70 }
      ],
      2
    );
    expect(picked.map((p) => p.id)).toEqual(["b", "c"]);
  });

  it("takes none when the land budget is 0", () => {
    const picked = selectListingsToLand([{ id: "a", score: 90 }], 0);
    expect(picked.map((p) => p.id)).toEqual([]);
  });
});

describe("extraPassCreateLimit", () => {
  it("caps the extra pass at remaining budget, not landed + budget", () => {
    expect(extraPassCreateLimit(2)).toBe(2);
    expect(extraPassCreateLimit(0)).toBe(0);
    expect(extraPassCreateLimit(-3)).toBe(0);
  });
});
