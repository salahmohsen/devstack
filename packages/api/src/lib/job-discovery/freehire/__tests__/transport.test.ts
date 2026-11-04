import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchFreehire } from "#@/lib/job-discovery/freehire/transport";

afterEach(() => vi.unstubAllGlobals());

describe("Freehire DNS route recovery", () => {
  it("retries a failed connection on another DNS route while preserving the TLS hostname", async () => {
    const fetch = vi
      .fn()
      .mockRejectedValueOnce(
        new TypeError("fetch failed", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })
      )
      .mockResolvedValueOnce(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);
    const signal = AbortSignal.timeout(15_000);
    const result = await fetchFreehire("https://freehire.me/api/v1/agent/jobs/search?limit=1", {
      signal
    });
    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[0]![0]).toBe(fetch.mock.calls[1]![0]);
    expect(fetch.mock.calls[0]![1].dispatcher).not.toBe(fetch.mock.calls[1]![1].dispatcher);
    expect(fetch.mock.calls[1]![1].signal).toBe(signal);
  });

  it("does not retry HTTP responses, caller cancellation, or a custom provider hostname", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 429 }));
    vi.stubGlobal("fetch", fetch);
    expect((await fetchFreehire("https://freehire.me/api/v1/jobs", {})).status).toBe(429);
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch
      .mockReset()
      .mockRejectedValue(
        new TypeError("fetch failed", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })
      );
    await expect(fetchFreehire("https://private.example/api/jobs", {})).rejects.toThrow(
      "fetch failed"
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    fetch.mockClear();
    await expect(
      fetchFreehire("https://freehire.me/api/v1/jobs", { signal: AbortSignal.abort() })
    ).rejects.toThrow("fetch failed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

it("rejects an untrusted certificate on the actual alternate TLS connection", async () => {
  const { readFileSync } = await import("node:fs");
  const { createServer } = await import("node:https");
  const { Resolver } = await import("node:dns/promises");
  const nativeFetch = globalThis.fetch;
  const server = createServer({
    key: readFileSync(new URL("./fixtures/untrusted-test-key.pem.fixture", import.meta.url)),
    cert: readFileSync(new URL("./fixtures/untrusted-test-cert.pem.fixture", import.meta.url))
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("TLS fixture failed to listen");
  const lookup = vi.spyOn(Resolver.prototype, "resolve4").mockResolvedValue(["127.0.0.1"]);
  vi.resetModules();
  const { fetchFreehire: freshFetch } = await import("#@/lib/job-discovery/freehire/transport");
  const fetch = vi
    .fn()
    .mockRejectedValueOnce(
      new TypeError("fetch failed", { cause: { code: "UND_ERR_CONNECT_TIMEOUT" } })
    )
    .mockImplementation(nativeFetch);
  vi.stubGlobal("fetch", fetch);
  try {
    await expect(
      freshFetch(`https://freehire.me:${address.port}/jobs`, {
        signal: AbortSignal.timeout(5_000)
      })
    ).rejects.toMatchObject({ cause: { code: "DEPTH_ZERO_SELF_SIGNED_CERT" } });
    expect(lookup).toHaveBeenCalledWith("freehire.me");
    expect(fetch).toHaveBeenCalledTimes(2);
  } finally {
    lookup.mockRestore();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
