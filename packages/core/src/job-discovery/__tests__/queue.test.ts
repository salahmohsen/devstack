import { describe, expect, it } from "vitest";

import {
  inboxAiJobId,
  inboxAiQueueJobId,
  inboxEvaluateJobId,
  ingestJobId,
  JobInboxAiPayloadSchema,
  sanitizeBullJobIdPart
} from "#@/job-discovery/queue";

describe("sanitizeBullJobIdPart", () => {
  it("strips colons that BullMQ rejects", () => {
    expect(sanitizeBullJobIdPart("pack:frontend")).toBe("pack_frontend");
    expect(sanitizeBullJobIdPart("custom:k8s|sre")).toBe("custom_k8s_sre");
  });
});

describe("inbox evaluate job ids", () => {
  it("uses eval_user_posting without colons", () => {
    expect(inboxEvaluateJobId("user:1", "post:abc")).toBe("eval_user_1_post_abc");
    expect(inboxAiQueueJobId({ userId: "u1", postingId: "p1" })).toBe("eval_u1_p1");
    expect(inboxAiQueueJobId({ userId: "u1", applicationId: "app1" })).toBe(inboxAiJobId("app1"));
  });
});

describe("JobInboxAiPayloadSchema", () => {
  it("requires postingId or applicationId", () => {
    expect(JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r" }).success).toBe(false);
    expect(
      JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r", postingId: "p" }).success
    ).toBe(true);
    expect(
      JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r", applicationId: "a" }).success
    ).toBe(true);
  });
});

describe("ingestJobId", () => {
  it("does not put a colon in a pack query job id", () => {
    const id = ingestJobId({
      mode: "user_query",
      userId: "user1",
      queryKey: "pack:frontend",
      now: new Date("2026-08-15T12:00:00.000Z")
    });
    expect(id).toBe("ingest_user1_pack_frontend_2026-08-15");
    expect(id.includes(":")).toBe(false);
  });

  it("keeps daily cron ids date-only", () => {
    expect(ingestJobId({ mode: "daily", now: new Date("2026-08-15T12:00:00.000Z") })).toBe(
      "ingest_daily_2026-08-15"
    );
  });
});
