import { describe, expect, it } from "vitest";

import {
  customDomainVerificationRecordName,
  normalizeHostname,
  parseHostname
} from "#@/domain/utils";

describe("normalizeHostname", () => {
  it("lowercases and strips trailing dots", () => {
    expect(normalizeHostname("Example.COM.")).toBe("example.com");
  });

  it("strips scheme, path, and port", () => {
    expect(normalizeHostname("https://www.Example.com:443/path")).toBe("www.example.com");
  });
});

describe("parseHostname", () => {
  it("accepts a valid FQDN", () => {
    const result = parseHostname("portfolio.example.com");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toBe("portfolio.example.com");
    }
  });

  it("rejects IP literals", () => {
    expect(parseHostname("127.0.0.1").success).toBe(false);
  });

  it("rejects empty / single-label hosts", () => {
    expect(parseHostname("localhost").success).toBe(false);
    expect(parseHostname("").success).toBe(false);
  });
});

describe("customDomainVerificationRecordName", () => {
  it("prefixes _career-verify", () => {
    expect(customDomainVerificationRecordName("salah.dev")).toBe("_career-verify.salah.dev");
  });
});
