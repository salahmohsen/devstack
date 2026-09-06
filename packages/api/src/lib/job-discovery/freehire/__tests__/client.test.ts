import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const loggerSpies = {
  set: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  emit: vi.fn()
};

vi.mock("@tsu-stack/logger/server", () => {
  return {
    createLogger: () => loggerSpies
  };
});

import {
  clearGeoCitiesCache,
  FreehireAgentJobSchema,
  resolveFreehireBaseUrl,
  searchFreehireCities,
  searchFreehireJobs
} from "#@/lib/job-discovery/freehire/client";

const SAMPLE_JOB = FreehireAgentJobSchema.parse({
  public_slug: "sample-job",
  source: "greenhouse",
  url: "https://boards.greenhouse.io/sample/jobs/1",
  title: "Senior Backend Engineer",
  company: "Sample",
  work_mode: "remote",
  enrichment_version: 2,
  enrichment: { summary: "Build APIs", salary_min: 120000, salary_currency: "USD" },
  reality: { class: "fresh", age_days: 2 }
});

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers }
  });
}

function okEnvelope(overrides: Record<string, unknown> = {}) {
  return {
    data: [SAMPLE_JOB],
    meta: { total: 42, limit: 100, offset: 0, ...overrides }
  };
}

function ratelimitHeaders() {
  return { "x-ratelimit-limit": "300", "x-ratelimit-remaining": "299" };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("resolveFreehireBaseUrl", () => {
  it("defaults to the public freehire API", () => {
    expect(resolveFreehireBaseUrl()).toBe("https://freehire.me/api/v1");
  });

  it("honors the FREEHIRE_API_BASE_URL server env override", async () => {
    vi.stubEnv("FREEHIRE_API_BASE_URL", "https://staging.example/api/v1");
    vi.resetModules();
    const mod = await import("#@/lib/job-discovery/freehire/client");
    expect(mod.resolveFreehireBaseUrl()).toBe("https://staging.example/api/v1");
    vi.unstubAllEnvs();
    vi.resetModules();
  });
});

describe("searchFreehireJobs", () => {
  it("parses the { data, meta } envelope and returns jobs + total", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse(okEnvelope(), 200, ratelimitHeaders()));
    vi.stubGlobal("fetch", fetchMock);

    const result = await searchFreehireJobs(new URLSearchParams({ limit: "100" }));

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://freehire.me/api/v1/agent/jobs/search?limit=100"),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(result.total).toBe(42);
    expect(result.jobs).toHaveLength(1);
    expect(result.jobs[0]!.public_slug).toBe("sample-job");
    expect(loggerSpies.set).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "freehire_agent_jobs_search_completed",
        status: 200,
        total: 42,
        ratelimitLimit: "300",
        ratelimitRemaining: "299"
      })
    );
    expect(loggerSpies.emit).toHaveBeenCalledTimes(1);
  });

  it("returns an empty job list on total 0", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ data: [], meta: { total: 0 } }))
    );
    const result = await searchFreehireJobs(new URLSearchParams());
    expect(result).toEqual({ jobs: [], total: 0 });
  });

  it("throws with the { error } body text on non-2xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "paused for maintenance" }, 503))
    );
    await expect(searchFreehireJobs(new URLSearchParams())).rejects.toThrow(
      /HTTP 503 paused for maintenance/
    );
    expect(loggerSpies.error).toHaveBeenCalled();
    expect(loggerSpies.emit).toHaveBeenCalledWith({ _forceKeep: true });
  });

  it("wraps a 2xx non-JSON body as a bad envelope with the parse error as cause", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response("<html>gateway splash</html>", {
          status: 200,
          headers: { "content-type": "text/html" }
        })
      )
    );
    const failure = searchFreehireJobs(new URLSearchParams()).catch((error: unknown) => error);
    const error = (await failure) as Error;
    expect(error.message).toContain("bad envelope (HTTP 200)");
    expect(error.cause).toBeInstanceOf(SyntaxError);
    expect(loggerSpies.emit).toHaveBeenCalledWith({ _forceKeep: true });
  });

  it("warns on meta.ignored_params instead of silently zeroing results", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(okEnvelope({ ignored_params: ["work_mode", "bogus_param"] }), 200)
        )
    );
    await searchFreehireJobs(new URLSearchParams());
    expect(loggerSpies.warn).toHaveBeenCalledWith("ignored_params_present", {
      ignoredParams: ["work_mode", "bogus_param"]
    });
  });

  it("aborts the request after the 15s timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      )
    );

    const pending = searchFreehireJobs(new URLSearchParams());
    const failure = pending.catch((error: unknown) => error);
    await vi.advanceTimersByTimeAsync(15_000);
    const error = (await failure) as Error;
    expect(error).toBeInstanceOf(DOMException);
    expect(error.message).toContain("Aborted");
    vi.useRealTimers();
  });

  it("propagates a caller abort signal", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(
        (_url: string, init?: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          })
      )
    );
    const controller = new AbortController();
    const pending = searchFreehireJobs(new URLSearchParams(), { signal: controller.signal });
    const failure = pending.catch((error: unknown) => error);
    controller.abort();
    const error = (await failure) as Error;
    expect(error).toBeInstanceOf(DOMException);
    expect(error.message).toContain("Aborted");
  });
});

describe("searchFreehireCities", () => {
  beforeEach(() => {
    clearGeoCitiesCache();
  });

  function citiesResponse(body: unknown, status = 200) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });
  }

  it("parses the { data: [{ value, country }] } envelope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      citiesResponse({
        data: [
          { value: "Berlin", country: "de" },
          { value: "Bern", country: "ch" }
        ]
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const options = await searchFreehireCities("ber");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("https://freehire.me/api/v1/geo/cities?q=ber"),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(options).toEqual([
      { value: "Berlin", country: "de" },
      { value: "Bern", country: "ch" }
    ]);
  });

  it("caches a query for repeated keystrokes", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(citiesResponse({ data: [{ value: "Berlin", country: "de" }] }))
    );
    vi.stubGlobal("fetch", fetchMock);

    await searchFreehireCities("ber");
    await searchFreehireCities("ber");
    await searchFreehireCities("BER");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns empty options when the key is blank", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(searchFreehireCities("   ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves to empty options on non-2xx instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(citiesResponse({ error: "down" }, 503)));
    await expect(searchFreehireCities("ber")).resolves.toEqual([]);
    expect(loggerSpies.error).toHaveBeenCalled();
    expect(loggerSpies.emit).toHaveBeenCalledWith({ _forceKeep: true });
  });

  it("resolves to empty options on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(searchFreehireCities("ber")).resolves.toEqual([]);
    expect(loggerSpies.error).toHaveBeenCalled();
  });

  it("refetches after the 1h cache TTL expires", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(() =>
      Promise.resolve(citiesResponse({ data: [{ value: "Berlin", country: "de" }] }))
    );
    vi.stubGlobal("fetch", fetchMock);

    const startedAt = Date.now();
    await searchFreehireCities("ber");
    vi.setSystemTime(startedAt + 60 * 60 * 1000 + 1);
    await searchFreehireCities("ber");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("evicts the oldest entry when the cache reaches its cap", async () => {
    const fetchMock = vi.fn(() => Promise.resolve(citiesResponse({ data: [] })));
    vi.stubGlobal("fetch", fetchMock);

    await searchFreehireCities("oldest");
    for (let i = 1; i < 500; i++) {
      await searchFreehireCities(`query-${i}`);
    }
    await searchFreehireCities("newest");
    expect(fetchMock).toHaveBeenCalledTimes(501);

    await searchFreehireCities("oldest");
    expect(fetchMock).toHaveBeenCalledTimes(502);
    await searchFreehireCities("newest");
    await searchFreehireCities("query-499");
    expect(fetchMock).toHaveBeenCalledTimes(502);
  });
});
