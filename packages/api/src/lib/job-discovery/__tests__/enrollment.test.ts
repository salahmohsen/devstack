import { drizzle } from "drizzle-orm/node-postgres";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb } = vi.hoisted(() => {
  return { mockGetDb: vi.fn() };
});

vi.mock("@tsu-stack/db", () => {
  return { getDb: mockGetDb };
});

import { jobPreference } from "@tsu-stack/db/schema";

import {
  activityWindowStart,
  enrolledUsersPredicate,
  hashToDelay,
  listEnrolledUserIds,
  utcDay
} from "#@/lib/job-discovery/enrollment";

function mockDb(rows: Array<{ userId: string }>) {
  const where = vi.fn().mockResolvedValue(rows);
  const from = vi.fn().mockReturnValue({ where });
  const selectDistinct = vi.fn().mockReturnValue({ from });
  const existsWhere = vi.fn().mockResolvedValue([]);
  const existsFrom = vi.fn().mockReturnValue({ where: existsWhere });
  const select = vi.fn().mockReturnValue({ from: existsFrom });
  return {
    selectDistinct,
    from,
    where,
    select,
    _mocks: { selectDistinct, from, where, select, existsWhere }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("activityWindowStart", () => {
  it("is now minus the 7-day DISCOVERY_ACTIVITY_WINDOW_MS", () => {
    expect(activityWindowStart(new Date("2026-09-05T12:00:00Z")).toISOString()).toBe(
      "2026-08-29T12:00:00.000Z"
    );
  });
});

describe("enrolledUsersPredicate (rendered SQL)", () => {
  const renderableDb = drizzle.mock();

  function render(windowStart: Date) {
    return renderableDb
      .selectDistinct({ userId: jobPreference.userId })
      .from(jobPreference)
      .where(enrolledUsersPredicate(renderableDb as never, windowStart))
      .toSQL();
  }

  it("requires role keywords OR categories via jsonb_array_length", () => {
    const query = render(new Date("2026-09-05T12:00:00Z"));
    expect(query.sql).toContain(
      `jsonb_array_length(coalesce("job_preference"."role_keywords", '[]'::jsonb)) > 0`
    );
    expect(query.sql).toContain(
      `jsonb_array_length(coalesce("job_preference"."categories", '[]'::jsonb)) > 0`
    );
    expect(query.sql).toContain(" or ");
  });

  it("requires a correlated recent session with a strict > window boundary", () => {
    const query = render(activityWindowStart(new Date("2026-09-05T12:00:00Z")));
    expect(query.sql).toContain("select distinct");
    expect(query.sql).toContain("exists (");
    expect(query.sql).toContain(`"session"."user_id" = "job_preference"."user_id"`);
    expect(query.sql).toContain(`"session"."updated_at" > $1`);
    expect(query.params).toEqual(["2026-08-29T12:00:00.000Z"]);
  });
});

describe("utcDay", () => {
  it("formats a UTC YYYY-MM-DD label", () => {
    expect(utcDay(new Date("2026-09-05T23:30:00Z"))).toBe("2026-09-05");
    expect(utcDay(new Date("2026-01-01T00:00:00Z"))).toBe("2026-01-01");
  });

  it("rolls over at UTC midnight, not local", () => {
    expect(utcDay(new Date("2026-09-05T23:59:59.999Z"))).toBe("2026-09-05");
    expect(utcDay(new Date("2026-09-06T00:00:00.000Z"))).toBe("2026-09-06");
  });
});

describe("hashToDelay", () => {
  it("is deterministic per userId", () => {
    expect(hashToDelay("user-abc")).toBe(hashToDelay("user-abc"));
    expect(hashToDelay("user-abc")).not.toBe(hashToDelay("user-abd"));
  });

  it("stays within [0, 24h) for arbitrary ids", () => {
    for (let i = 0; i < 500; i += 1) {
      const delay = hashToDelay(`user-${i}`);
      expect(delay).toBeGreaterThanOrEqual(0);
      expect(delay).toBeLessThan(86_400_000);
      expect(Number.isInteger(delay)).toBe(true);
    }
  });
});

describe("listEnrolledUserIds", () => {
  it("runs one distinct facet+session query and maps the user ids", async () => {
    const db = mockDb([{ userId: "u1" }, { userId: "u2" }]);
    mockGetDb.mockReturnValue(db as never);

    const result = await listEnrolledUserIds(new Date("2026-09-05T00:00:00Z"));

    expect(db._mocks.selectDistinct).toHaveBeenCalledWith({ userId: expect.anything() });
    expect(db._mocks.selectDistinct).toHaveBeenCalledTimes(1);
    expect(db._mocks.from).toHaveBeenCalledTimes(1);
    expect(db._mocks.where).toHaveBeenCalledTimes(1);
    expect(result).toEqual(["u1", "u2"]);
  });

  it("returns an empty list when no user is enrolled", async () => {
    mockGetDb.mockReturnValue(mockDb([]) as never);
    await expect(listEnrolledUserIds(new Date())).resolves.toEqual([]);
  });
});
