import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";

const { status } = vi.hoisted(() => {
  return { status: vi.fn() };
});
vi.mock("@tsu-stack/api/client/tanstack-start/orpc", () => {
  return {
    orpcClient: { jobDiscovery: { status } },
    orpcQueryClient: {
      jobDiscovery: {
        status: {
          queryOptions: () => {
            return { queryKey: ["status"] };
          }
        }
      }
    }
  };
});
vi.mock("@tsu-stack/auth/react/tanstack-start/hooks", () => {
  return { useAuth: vi.fn() };
});

import { getDiscoveryStatusQueryOptions } from "@/features/job-discovery/api/discovery-status.query";

describe("discovery status response account", () => {
  it("never caches another session's response under the old account key", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const options = getDiscoveryStatusQueryOptions("account-a");
    status.mockResolvedValueOnce({ userId: "account-b", run: { runId: "private-b" } });
    await expect(client.fetchQuery(options)).rejects.toThrow("account changed");
    expect(client.getQueryData(options.queryKey)).toBeUndefined();
    client.clear();
  });
  it("caches a matching account response", async () => {
    const client = new QueryClient();
    const options = getDiscoveryStatusQueryOptions("account-a");
    status.mockResolvedValueOnce({ userId: "account-a", run: null });
    await expect(client.fetchQuery(options)).resolves.toMatchObject({ userId: "account-a" });
    expect(client.getQueryData(options.queryKey)).toMatchObject({ userId: "account-a" });
    client.clear();
  });
});
