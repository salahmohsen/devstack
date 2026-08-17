import { describe, expect, it } from "vitest";

import { userTurnAsksStackCatalog, userTurnRetriesStackCatalog } from "#@/hub/stack-catalog-ask";

describe("userTurnAsksStackCatalog", () => {
  it("catches everyday stack and skill asks", () => {
    expect(userTurnAsksStackCatalog("pull my stack list")).toBe(true);
    expect(userTurnAsksStackCatalog("filter all my stacks in a structured way")).toBe(true);
    expect(userTurnAsksStackCatalog("what skills do I use")).toBe(true);
    expect(userTurnAsksStackCatalog("pull my skills list")).toBe(true);
    expect(userTurnAsksStackCatalog("skills I have on file")).toBe(true);
    expect(userTurnAsksStackCatalog("tools I use")).toBe(true);
    expect(
      userTurnAsksStackCatalog("other technologies/languages you are most experienced in")
    ).toBe(true);
    expect(userTurnAsksStackCatalog("tech I know")).toBe(true);
  });

  it("does not steal Today, inspect, or organize", () => {
    expect(userTurnAsksStackCatalog("what do you have today?")).toBe(false);
    expect(userTurnAsksStackCatalog("open mentech")).toBe(false);
    expect(userTurnAsksStackCatalog("organize my stacks")).toBe(false);
    expect(userTurnAsksStackCatalog("detect stacks on Dev-Hub")).toBe(false);
  });
});

describe("userTurnRetriesStackCatalog", () => {
  it("treats you-didn't-pull as a retry", () => {
    expect(
      userTurnRetriesStackCatalog(
        "you didn't pull the stack list and you didn't generated an answer"
      )
    ).toBe(true);
    expect(userTurnRetriesStackCatalog("again you didn't generate an answer")).toBe(true);
    expect(userTurnRetriesStackCatalog("i cant find your answer")).toBe(true);
    expect(userTurnRetriesStackCatalog("hello there")).toBe(false);
  });
});
