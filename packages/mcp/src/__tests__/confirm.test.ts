import { describe, expect, it } from "vitest";

import { CONFIRM_TTL_MS, signConfirm, verifyConfirm } from "#@/confirm";

const base = { secret: "s".repeat(32), userId: "u1", tool: "mail_send_reply" };
const input = { messageId: "m1", body: "hello" };
const now = 1_000_000;

describe("confirm gate", () => {
  it("accepts a fresh token for the same user, tool, and input", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, input, token, now: now + 1000 })).toBe("ok");
  });

  it("ignores key order in the input", () => {
    const token = signConfirm({ ...base, input, now });
    const reordered = { body: "hello", messageId: "m1" };
    expect(verifyConfirm({ ...base, input: reordered, token, now })).toBe("ok");
  });

  it("rejects changed input", () => {
    const token = signConfirm({ ...base, input, now });
    const tampered = { ...input, body: "different" };
    expect(verifyConfirm({ ...base, input: tampered, token, now })).toBe("invalid");
  });

  it("rejects another user or another tool", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, userId: "u2", input, token, now })).toBe("invalid");
    expect(verifyConfirm({ ...base, tool: "applications_delete", input, token, now })).toBe(
      "invalid"
    );
  });

  it("rejects an expired token", () => {
    const token = signConfirm({ ...base, input, now });
    expect(verifyConfirm({ ...base, input, token, now: now + CONFIRM_TTL_MS + 1 })).toBe("expired");
  });

  it("rejects garbage", () => {
    expect(verifyConfirm({ ...base, input, token: "nope", now })).toBe("invalid");
  });
});
