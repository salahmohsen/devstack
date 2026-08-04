import { describe, expect, it } from "vitest";

import { assertPublicHttpUrl } from "#@/common/public-http-url";

describe("assertPublicHttpUrl", () => {
  it("allows https public hosts", () => {
    const u = assertPublicHttpUrl("https://example.com/jobs/1");
    expect(u.protocol).toBe("https:");
    expect(u.hostname).toBe("example.com");
  });

  it("allows http public hosts", () => {
    const u = assertPublicHttpUrl("http://example.com/path");
    expect(u.protocol).toBe("http:");
  });

  it("allows public IPv4", () => {
    expect(assertPublicHttpUrl("https://8.8.8.8/").hostname).toBe("8.8.8.8");
  });

  it("blocks localhost", () => {
    expect(() => assertPublicHttpUrl("http://localhost/secret")).toThrow(/blocked/i);
    expect(() => assertPublicHttpUrl("http://LOCALHOST/secret")).toThrow(/blocked/i);
    expect(() => assertPublicHttpUrl("http://foo.localhost/secret")).toThrow(/blocked/i);
  });

  it("blocks 127.0.0.0/8", () => {
    expect(() => assertPublicHttpUrl("http://127.0.0.1/")).toThrow(/private|reserved|blocked/i);
    expect(() => assertPublicHttpUrl("http://127.1.2.3/")).toThrow(/private|reserved|blocked/i);
  });

  it("blocks 10.0.0.0/8", () => {
    expect(() => assertPublicHttpUrl("http://10.0.0.1/")).toThrow(/private|reserved/i);
    expect(() => assertPublicHttpUrl("http://10.255.255.255/")).toThrow(/private|reserved/i);
  });

  it("blocks 172.16.0.0/12", () => {
    expect(() => assertPublicHttpUrl("http://172.16.0.1/")).toThrow(/private|reserved/i);
    expect(() => assertPublicHttpUrl("http://172.31.255.255/")).toThrow(/private|reserved/i);
  });

  it("allows 172.x outside /12", () => {
    expect(assertPublicHttpUrl("http://172.32.0.1/").hostname).toBe("172.32.0.1");
    expect(assertPublicHttpUrl("http://172.15.0.1/").hostname).toBe("172.15.0.1");
  });

  it("blocks 192.168.0.0/16", () => {
    expect(() => assertPublicHttpUrl("http://192.168.1.1/")).toThrow(/private|reserved/i);
  });

  it("blocks 169.254.0.0/16 and metadata IP", () => {
    expect(() => assertPublicHttpUrl("http://169.254.169.254/latest/meta-data")).toThrow(
      /private|reserved|blocked/i
    );
    expect(() => assertPublicHttpUrl("http://169.254.1.1/")).toThrow(/private|reserved/i);
  });

  it("blocks metadata.google.internal", () => {
    expect(() => assertPublicHttpUrl("http://metadata.google.internal/")).toThrow(/blocked/i);
  });

  it("blocks IPv6 loopback and link-local / ULA", () => {
    expect(() => assertPublicHttpUrl("http://[::1]/")).toThrow(/private|reserved/i);
    expect(() => assertPublicHttpUrl("http://[fe80::1]/")).toThrow(/private|reserved/i);
    expect(() => assertPublicHttpUrl("http://[fd12:3456:789a::1]/")).toThrow(/private|reserved/i);
  });

  it("rejects non-http(s) schemes", () => {
    expect(() => assertPublicHttpUrl("file:///etc/passwd")).toThrow(/scheme/i);
    expect(() => assertPublicHttpUrl("ftp://example.com/")).toThrow(/scheme/i);
    expect(() => assertPublicHttpUrl("javascript:alert(1)")).toThrow();
  });

  it("rejects invalid URLs", () => {
    expect(() => assertPublicHttpUrl("not a url")).toThrow(/invalid/i);
  });
});
