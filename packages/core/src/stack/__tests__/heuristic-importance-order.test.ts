import { describe, expect, it } from "vitest";

import {
  groupStacksByTypeBand,
  heuristicImportanceOrder
} from "#@/stack/heuristic-importance-order";

describe("heuristicImportanceOrder", () => {
  it("orders by type foundation then project count", () => {
    const order = heuristicImportanceOrder([
      { id: "eslint", name: "ESLint", type: "tooling", projectCount: 5 },
      { id: "react", name: "React", type: "framework", projectCount: 2 },
      { id: "ts", name: "TypeScript", type: "language", projectCount: 3 },
      { id: "vite", name: "Vite", type: "tooling", projectCount: 1 },
      { id: "next", name: "Next.js", type: "framework", projectCount: 4 }
    ]);
    expect(order).toEqual(["ts", "next", "react", "eslint", "vite"]);
  });

  it("includes every id exactly once", () => {
    const stacks = [
      { id: "a", name: "A", type: null, projectCount: 0 },
      { id: "b", name: "B", type: "other", projectCount: 0 }
    ];
    const order = heuristicImportanceOrder(stacks);
    expect(order.toSorted()).toEqual(["a", "b"]);
  });
});

describe("groupStacksByTypeBand", () => {
  it("emits foundation type bands with project-count order inside", () => {
    const bands = groupStacksByTypeBand([
      { id: "eslint", name: "ESLint", type: "tooling", projectCount: 5 },
      { id: "react", name: "React", type: "framework", projectCount: 2 },
      { id: "ts", name: "TypeScript", type: "language", projectCount: 3 },
      { id: "next", name: "Next.js", type: "framework", projectCount: 4 },
      { id: "vite", name: "Vite", type: "tooling", projectCount: 1 }
    ]);
    expect(bands.map((b) => b.type)).toEqual(["language", "framework", "tooling"]);
    expect(bands[1]!.stacks.map((s) => s.id)).toEqual(["next", "react"]);
    expect(bands[2]!.stacks.map((s) => s.id)).toEqual(["eslint", "vite"]);
  });
});
