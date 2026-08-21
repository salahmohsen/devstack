import { describe, expect, it } from "vitest";

import { findMatchingKeywords, matchesKeywordPhrase } from "#@/job-preference/phrase-match";

describe("matchesKeywordPhrase §6.3", () => {
  it.each([
    ["Senior React Native Engineer", "react native", true],
    ["Senior React Native Engineer", "react", false],
    ["Senior React Engineer", "react", true],
    ["React.js Developer", "react", true],
    ["PHP Engineer", "php", true],
    ["Front End Angular Engineer", "frontend", true],
    ["Frontend Engineer", "front-end", true],
    ["Senior Front-End Developer", "frontend", true],
    ["Backend Engineer", "back end", true],
    ["Full Stack Engineer", "fullstack", true],
    ["Graphic Designer", "frontend", false]
  ] as const)("%s vs keyword %s → %s", (haystack, keyword, expected) => {
    expect(matchesKeywordPhrase(haystack, keyword)).toBe(expected);
  });

  it("still matches react when a free React token sits beside React Native", () => {
    expect(matchesKeywordPhrase("React Native and React Engineer", "react")).toBe(true);
  });
});

describe("findMatchingKeywords", () => {
  it("returns only phrase hits", () => {
    expect(
      findMatchingKeywords("Senior React Native Engineer", ["react", "react native", "php"])
    ).toEqual(["react native"]);
  });
});
