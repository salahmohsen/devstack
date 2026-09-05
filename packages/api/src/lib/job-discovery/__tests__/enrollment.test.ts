import { beforeEach, describe, expect, it, vi } from "vitest";

import { activityWindowStart, listEnrolledUserIds } from "#@/lib/job-discovery/enrollment";

const { mockGetDb } = vi.hoisted(() => {
  return { mockGetDb: vi.fn() };
});

vi.mock("@tsu-stack/db", () => {
  return { getDb: mockGetDb };
});

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

  it("builds the where clause from the facet predicate and the session-exists window", async () => {
    const db = mockDb([]);
    mockGetDb.mockReturnValue(db as never);

    await listEnrolledUserIds(new Date("2026-09-05T12:00:00Z"));

    expect(db._mocks.where).toHaveBeenCalledTimes(1);
    expect(db._mocks.where.mock.calls[0]).toHaveLength(1);
    expect(db._mocks.existsWhere).toHaveBeenCalledTimes(1);
  });

  it("returns an empty list when no user is enrolled", async () => {
    mockGetDb.mockReturnValue(mockDb([]) as never);
    await expect(listEnrolledUserIds(new Date())).resolves.toEqual([]);
  });
});
