import { describe, expect, it } from "vitest";

import {
  astToFilterValues,
  filterValuesToAst,
  ListQueryError,
  parseRsql,
  printRsql,
  type FilterLeaf
} from "#@/list-query/index";

describe("list-query RSQL", () => {
  it("round-trips is_any_of through =in= leaves", () => {
    const leaves: FilterLeaf[] = [
      { id: "projects", field: "projects", operator: "is_any_of", value: ["p1", "p2"] }
    ];
    const rsql = printRsql(filterValuesToAst(leaves));
    expect(rsql).toBe("projects=in=(p1,p2)");
    const back = astToFilterValues(parseRsql(rsql, "skills"));
    expect(back).toEqual([
      expect.objectContaining({
        field: "projects",
        operator: "is_any_of",
        value: ["p1", "p2"]
      })
    ]);
  });

  it("prints contains as =ilike=", () => {
    const ast = filterValuesToAst([
      { id: "1", field: "title", operator: "contains", value: "acme" }
    ]);
    expect(printRsql(ast)).toBe("title=ilike=acme");
  });

  it("prints is_empty as ==null and round-trips to an is_empty leaf", () => {
    const ast = filterValuesToAst([
      { id: "1", field: "tiedToJob", operator: "is_empty", value: null }
    ]);
    expect(printRsql(ast)).toBe("tiedToJob==null");
    const back = astToFilterValues(parseRsql(printRsql(ast), "resumes"));
    expect(back).toEqual([expect.objectContaining({ field: "tiedToJob", operator: "is_empty" })]);
  });

  it("round-trips between two bounds as one =between= leaf, not two chips", () => {
    const leaves: FilterLeaf[] = [
      {
        id: "matchScore",
        field: "matchScore",
        operator: "between",
        value: { min: 3, max: 10 }
      },
      { id: "trackingStatus", field: "trackingStatus", operator: "is", value: "inbox" }
    ];
    const rsql = printRsql(filterValuesToAst(leaves));
    expect(rsql).toContain("matchScore=between=(3,10)");
    expect(rsql).not.toMatch(/matchScore>=/);
    expect(rsql).not.toMatch(/matchScore<=/);
    const chips = astToFilterValues(parseRsql(rsql, "new-jobs"));
    const scoreChips = chips.filter((chip) => chip.field === "matchScore");
    expect(scoreChips).toHaveLength(1);
    expect(scoreChips[0]).toEqual(
      expect.objectContaining({
        field: "matchScore",
        operator: "between",
        value: { min: 3, max: 10 }
      })
    );
  });

  it("parses one-sided matchScore>=3 as a between chip with max null", () => {
    const chips = astToFilterValues(parseRsql("trackingStatus==inbox;matchScore>=3", "new-jobs"));
    expect(chips.find((chip) => chip.field === "matchScore")).toEqual(
      expect.objectContaining({
        field: "matchScore",
        operator: "between",
        value: { min: 3, max: null }
      })
    );
  });

  it("throws ListQueryError for an unknown field on the skills allowlist", () => {
    expect(() => parseRsql("foo==bar", "skills")).toThrow(ListQueryError);
  });

  it("throws when new jobs filter trackingStatus==tracked", () => {
    expect(() => parseRsql("trackingStatus==tracked", "new-jobs")).toThrow(ListQueryError);
  });

  it("allows outcome=unrestricted= only on tracked jobs", () => {
    expect(() => parseRsql("outcome=unrestricted=", "tracked-jobs")).not.toThrow();
    expect(() => parseRsql("trackingStatus==inbox;outcome=unrestricted=", "new-jobs")).toThrow(
      ListQueryError
    );
  });

  it("omits incomplete is_any_of with an empty array from print", () => {
    const ast = filterValuesToAst([
      { id: "1", field: "projects", operator: "is_any_of", value: [] },
      { id: "2", field: "type", operator: "is", value: "ui" }
    ]);
    expect(printRsql(ast)).toBe("type==ui");
  });

  it("builds an AND of complete leaves", () => {
    const ast = filterValuesToAst([
      { id: "1", field: "type", operator: "is", value: "ui" },
      { id: "2", field: "isFeatured", operator: "is", value: "true" }
    ]);
    expect(ast).toEqual({
      type: "and",
      children: [
        { type: "cmp", field: "type", op: "eq", args: ["ui"] },
        { type: "cmp", field: "isFeatured", op: "eq", args: ["true"] }
      ]
    });
  });

  it("throws when a present new-jobs filter has no trackingStatus leaf", () => {
    expect(() => parseRsql("matchScore>=3", "new-jobs")).toThrow(ListQueryError);
  });

  it("throws when a present tracked filter has no outcome leaf", () => {
    expect(() => parseRsql("stage==interview", "tracked-jobs")).toThrow(ListQueryError);
  });

  it("does not emit a chip for outcome=unrestricted= and keeps other leaves", () => {
    const chips = astToFilterValues(
      parseRsql("outcome=unrestricted=;stage==interview", "tracked-jobs")
    );
    expect(chips.some((chip) => chip.field === "outcome")).toBe(false);
    expect(chips).toEqual([
      expect.objectContaining({ field: "stage", operator: "is", value: "interview" })
    ]);
  });
});
