import { describe, expect, it } from "vitest";

import {
  CertificationOutputSchema,
  CreateCertificationInputSchema,
  UpdateCertificationInputSchema
} from "#@/certification/types";

describe("certification contracts", () => {
  it("accepts a full entry", () => {
    const parsed = CreateCertificationInputSchema.safeParse({
      name: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      issuedAt: "2023-05",
      expiresAt: "2026-05",
      credentialUrl: "https://aws.amazon.com/verification/abc123",
      description: "Associate level certification"
    });
    expect(parsed.success).toBe(true);
  });

  it("requires name and issuer, allows the rest empty", () => {
    const parsed = CreateCertificationInputSchema.safeParse({ name: "X", issuer: "Y" });
    expect(parsed.success).toBe(true);
    expect(CreateCertificationInputSchema.safeParse({ name: "X" }).success).toBe(false);
    expect(CreateCertificationInputSchema.safeParse({ issuer: "Y" }).success).toBe(false);
  });

  it("coerces empty credentialUrl to null", () => {
    const parsed = CreateCertificationInputSchema.parse({
      name: "X",
      issuer: "Y",
      credentialUrl: ""
    });
    expect(parsed.credentialUrl).toBeNull();
  });

  it("rejects a non-URL credentialUrl", () => {
    expect(
      CreateCertificationInputSchema.safeParse({
        name: "X",
        issuer: "Y",
        credentialUrl: "not-a-url"
      }).success
    ).toBe(false);
  });

  it("rejects credentialUrl schemes other than http(s)", () => {
    for (const credentialUrl of [
      "javascript:alert(1)",
      "ftp://example.com/cert",
      "data:text/html,x"
    ]) {
      expect(
        CreateCertificationInputSchema.safeParse({ name: "X", issuer: "Y", credentialUrl }).success
      ).toBe(false);
    }
  });

  it("update schema is partial", () => {
    expect(UpdateCertificationInputSchema.safeParse({ issuer: "Y" }).success).toBe(true);
    expect(UpdateCertificationInputSchema.safeParse({}).success).toBe(true);
  });

  it("coerces blank and whitespace dates to null", () => {
    const parsed = CreateCertificationInputSchema.parse({
      name: "X",
      issuer: "Y",
      issuedAt: "",
      expiresAt: "  "
    });
    expect(parsed.issuedAt).toBeNull();
    expect(parsed.expiresAt).toBeNull();
  });

  it("output schema validates a row shape", () => {
    const parsed = CertificationOutputSchema.safeParse({
      id: "c1",
      name: "AWS Solutions Architect",
      issuer: "Amazon Web Services",
      issuedAt: null,
      expiresAt: null,
      credentialUrl: null,
      description: null,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    expect(parsed.success).toBe(true);
  });
});
