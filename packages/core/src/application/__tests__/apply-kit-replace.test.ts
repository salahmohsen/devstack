import { describe, expect, it } from "vitest";

import { runFailClosedApplyKitReplace } from "#@/application/apply-kit-replace";

describe("runFailClosedApplyKitReplace", () => {
  it("does not delete the old kit when PUT fails", async () => {
    const events: string[] = [];
    const result = await runFailClosedApplyKitReplace({
      putNew: async () => {
        events.push("put");
        throw new Error("put failed");
      },
      commitDb: async () => {
        events.push("commit");
      },
      deleteOldBestEffort: async () => {
        events.push("delete-old");
      },
      deleteNewBestEffort: async () => {
        events.push("delete-new");
      }
    });
    expect(result).toEqual({ ok: false, stage: "put", error: expect.any(Error) });
    expect(events).toEqual(["put", "delete-new"]);
  });

  it("does not delete the old kit when DB commit fails", async () => {
    const events: string[] = [];
    const result = await runFailClosedApplyKitReplace({
      putNew: async () => {
        events.push("put");
      },
      commitDb: async () => {
        events.push("commit");
        throw new Error("commit failed");
      },
      deleteOldBestEffort: async () => {
        events.push("delete-old");
      },
      deleteNewBestEffort: async () => {
        events.push("delete-new");
      }
    });
    expect(result).toEqual({ ok: false, stage: "commit", error: expect.any(Error) });
    expect(events).toEqual(["put", "commit", "delete-new"]);
  });

  it("deletes the old kit only after PUT and commit succeed", async () => {
    const events: string[] = [];
    const result = await runFailClosedApplyKitReplace({
      putNew: async () => {
        events.push("put");
      },
      commitDb: async () => {
        events.push("commit");
      },
      deleteOldBestEffort: async () => {
        events.push("delete-old");
      },
      deleteNewBestEffort: async () => {
        events.push("delete-new");
      }
    });
    expect(result).toEqual({ ok: true });
    expect(events).toEqual(["put", "commit", "delete-old"]);
  });

  it("treats old-object delete failure as success", async () => {
    const result = await runFailClosedApplyKitReplace({
      putNew: async () => undefined,
      commitDb: async () => undefined,
      deleteOldBestEffort: async () => {
        throw new Error("old object gone");
      },
      deleteNewBestEffort: async () => {
        throw new Error("should not run");
      }
    });
    expect(result).toEqual({ ok: true });
  });
});
