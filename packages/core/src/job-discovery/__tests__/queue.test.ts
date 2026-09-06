import { describe, expect, it } from "vitest";

import {
  inboxAiJobId,
  inboxAiQueueJobId,
  inboxEvaluateJobId,
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
  it("uses eval_user_job without colons", () => {
    expect(inboxEvaluateJobId("user:1", "job:abc")).toBe("eval_user_1_job_abc");
    expect(inboxAiQueueJobId({ userId: "u1", jobId: "j1" })).toBe("eval_u1_j1");
    expect(inboxAiQueueJobId({ userId: "u1", applicationId: "app1" })).toBe(inboxAiJobId("app1"));
  });
});

describe("JobInboxAiPayloadSchema", () => {
  it("requires jobId or applicationId", () => {
    expect(JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r" }).success).toBe(false);
    expect(JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r", jobId: "j" }).success).toBe(
      true
    );
    expect(
      JobInboxAiPayloadSchema.safeParse({ userId: "u", runId: "r", applicationId: "a" }).success
    ).toBe(true);
  });
});
