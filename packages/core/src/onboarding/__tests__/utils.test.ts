import { describe, expect, it } from "vitest";

import {
  assignClientIds,
  normalizeResumeYear,
  resolveResumeSourceObjectKey
} from "#@/onboarding/utils";

describe("resolveResumeSourceObjectKey", () => {
  const userId = "user-abc";

  it("accepts relative resume-sources keys and returns the full key", () => {
    expect(resolveResumeSourceObjectKey("resume-sources/file.pdf", userId)).toBe(
      "user-abc/resume-sources/file.pdf"
    );
  });

  it("accepts full keys under the session user", () => {
    expect(resolveResumeSourceObjectKey("user-abc/resume-sources/file.pdf", userId)).toBe(
      "user-abc/resume-sources/file.pdf"
    );
  });

  it("strips a leading slash before resolving", () => {
    expect(resolveResumeSourceObjectKey("/resume-sources/file.pdf", userId)).toBe(
      "user-abc/resume-sources/file.pdf"
    );
  });

  it("rejects empty keys and empty userId", () => {
    expect(resolveResumeSourceObjectKey("", userId)).toBeNull();
    expect(resolveResumeSourceObjectKey("   ", userId)).toBeNull();
    expect(resolveResumeSourceObjectKey("resume-sources/file.pdf", "")).toBeNull();
  });

  it("rejects path traversal", () => {
    expect(resolveResumeSourceObjectKey("resume-sources/../secret.pdf", userId)).toBeNull();
    expect(
      resolveResumeSourceObjectKey("user-abc/resume-sources/../../etc/passwd", userId)
    ).toBeNull();
  });

  it("rejects generated resumes/ keys", () => {
    expect(resolveResumeSourceObjectKey("resumes/out.pdf", userId)).toBeNull();
    expect(resolveResumeSourceObjectKey("user-abc/resumes/out.pdf", userId)).toBeNull();
  });

  it("rejects keys for another user", () => {
    expect(resolveResumeSourceObjectKey("other-user/resume-sources/file.pdf", userId)).toBeNull();
  });

  it("rejects prefix-only keys without an object name", () => {
    expect(resolveResumeSourceObjectKey("resume-sources/", userId)).toBeNull();
    expect(resolveResumeSourceObjectKey("user-abc/resume-sources/", userId)).toBeNull();
  });

  it("rejects unrelated prefixes", () => {
    expect(resolveResumeSourceObjectKey("logos/file.png", userId)).toBeNull();
    expect(resolveResumeSourceObjectKey("file.pdf", userId)).toBeNull();
  });
});

describe("normalizeResumeYear", () => {
  it("prefers an explicit positive year", () => {
    expect(
      normalizeResumeYear({
        year: 2019,
        fromDate: "2020-01-01",
        toDate: "2021-12-31"
      })
    ).toBe(2019);
  });

  it("uses toDate year when year is missing", () => {
    expect(
      normalizeResumeYear({
        fromDate: "2018-01-01",
        toDate: "2020-06-15"
      })
    ).toBe(2020);
  });

  it("uses fromDate year when year and toDate are missing", () => {
    expect(
      normalizeResumeYear({
        fromDate: "2017-03-01",
        toDate: null
      })
    ).toBe(2017);
  });

  it("falls back to the current calendar year", () => {
    const current = new Date().getFullYear();
    expect(normalizeResumeYear({})).toBe(current);
    expect(normalizeResumeYear({ year: 0, fromDate: "", toDate: null })).toBe(current);
  });

  it("truncates fractional years", () => {
    expect(normalizeResumeYear({ year: 2021.9 })).toBe(2021);
  });
});

describe("assignClientIds", () => {
  it("assigns clientIds when missing and preserves existing ones", () => {
    const result = assignClientIds([
      { title: "A", clientId: "keep-me" },
      { title: "B" },
      { title: "C", clientId: "" }
    ]);

    expect(result[0]?.clientId).toBe("keep-me");
    expect(result[1]?.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result[2]?.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result[1]?.clientId).not.toBe(result[2]?.clientId);
  });

  it("reassigns whitespace-only clientIds", () => {
    const result = assignClientIds([
      { title: "A", clientId: "   " },
      { title: "B", clientId: "\t" }
    ]);

    expect(result[0]?.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result[1]?.clientId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
    expect(result[0]?.clientId).not.toBe(result[1]?.clientId);
  });
});
