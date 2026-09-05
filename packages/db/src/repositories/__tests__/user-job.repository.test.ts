import { type and, type SQL } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { application } from "../../schema/application.schema.ts";
import { userJob } from "../../schema/user-job.schema.ts";
import { userJobRepository } from "../user-job.repository.ts";

const renderSql = (expr: ReturnType<typeof and>) => new PgDialect().sqlToQuery(expr!).sql;

vi.mock("../../index.ts", () => {
  return {
    getDb: vi.fn()
  };
});

import { getDb } from "../../index.ts";

const mockGetDb = vi.mocked(getDb);

function buildMockDb() {
  const mockSelect = vi.fn();
  const mockInsert = vi.fn();
  const mockDelete = vi.fn();
  const mockReturning = vi.fn();

  return {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    _mocks: { mockSelect, mockInsert, mockDelete, mockReturning }
  };
}

function row(overrides: Partial<typeof userJob.$inferSelect> = {}) {
  return {
    id: "uj-1",
    userId: "user-1",
    freehireSlug: "acme-sre",
    title: "SRE",
    companyName: "Acme",
    listingUrl: "https://freehire.dev/jobs/acme-sre",
    skills: [],
    domains: [],
    queryHash: "hash-1",
    queryFilters: {},
    firstSeenAt: new Date(0),
    lastSeenAt: new Date(0),
    ...overrides
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("userJobRepository", () => {
  describe("upsertMany", () => {
    function buildUpsertMock() {
      const mockDb = buildMockDb();
      const onConflict = vi
        .fn()
        .mockReturnValue({ returning: vi.fn().mockResolvedValue([{ id: "uj-1" }]) });
      mockDb.insert.mockReturnValue({
        values: vi.fn().mockReturnValue({ onConflictDoUpdate: onConflict })
      });
      mockGetDb.mockReturnValue(mockDb as never);
      return { mockDb, onConflict };
    }

    it("issues onConflictDoUpdate keyed on (userId, freehireSlug), sets lastSeenAt, never firstSeenAt", async () => {
      const { mockDb, onConflict } = buildUpsertMock();

      const result = await userJobRepository.upsertMany("user-1", [row()]);

      expect(mockDb.insert).toHaveBeenCalledWith(userJob);
      const insertChain = mockDb.insert.mock.results[0].value;
      expect(insertChain.values).toHaveBeenCalled();
      const values = insertChain.values.mock.calls[0][0];
      expect(values).toHaveLength(1);
      expect(values[0].userId).toBe("user-1");
      expect(values[0].id).toEqual(expect.any(String));

      expect(onConflict).toHaveBeenCalledTimes(1);
      const conflictArg = onConflict.mock.calls[0][0];
      expect(conflictArg.target).toEqual([userJob.userId, userJob.freehireSlug]);

      const setKeys = Object.keys(conflictArg.set);
      expect(setKeys).toContain("lastSeenAt");
      expect(setKeys).toContain("title");
      expect(setKeys).not.toContain("firstSeenAt");
      expect(setKeys).not.toContain("id");
      expect(setKeys).not.toContain("userId");
      expect(setKeys).not.toContain("freehireSlug");

      expect(result).toBe(1);
    });

    it("strips caller-supplied audit timestamps so DB defaults govern the insert", async () => {
      const { mockDb } = buildUpsertMock();

      await userJobRepository.upsertMany("user-1", [
        row({ firstSeenAt: new Date("2020-01-01"), lastSeenAt: new Date("2020-01-02") })
      ]);

      const values = mockDb.insert.mock.results[0].value.values.mock.calls[0][0];
      expect(values[0]).not.toHaveProperty("firstSeenAt");
      expect(values[0]).not.toHaveProperty("lastSeenAt");
    });

    it("guards snapshot overwrites on conflict: longer-of text, empty-skills keep, now() bump", async () => {
      const { onConflict } = buildUpsertMock();
      await userJobRepository.upsertMany("user-1", [row()]);

      const set = onConflict.mock.calls[0][0].set as Record<string, SQL>;
      const lastSeenSql = new PgDialect().sqlToQuery(set.lastSeenAt).sql;
      expect(lastSeenSql).toBe("now()");

      const descriptionSql = new PgDialect().sqlToQuery(set.description).sql;
      expect(descriptionSql).toContain(`coalesce(excluded."description", '')`);
      expect(descriptionSql).toContain('user_job."description"');
      expect(descriptionSql).toContain(
        `length(excluded."description") >= length(user_job."description")`
      );

      const summarySql = new PgDialect().sqlToQuery(set.summary).sql;
      expect(summarySql).toContain('user_job."summary"');

      const skillsSql = new PgDialect().sqlToQuery(set.skills).sql;
      expect(skillsSql).toContain(`coalesce(excluded."skills", '[]'::jsonb) = '[]'::jsonb`);
      expect(skillsSql).toContain('user_job."skills"');
    });

    it("returns 0 without touching the db for empty input", async () => {
      const mockDb = buildMockDb();
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.upsertMany("user-1", []);

      expect(mockDb.insert).not.toHaveBeenCalled();
      expect(result).toBe(0);
    });
  });

  describe("listUnlanded", () => {
    it("applies userId, exclude lists, optional queryHash, order and limit", async () => {
      const rows = [row()];
      const where = vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue(rows)
        })
      });
      const mockDb = buildMockDb();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.listUnlanded({
        userId: "user-1",
        excludeUrls: ["https://freehire.dev/jobs/excluded"],
        excludeJobIds: ["uj-9"],
        limit: 25,
        queryHash: "hash-1"
      });

      expect(mockDb.select).toHaveBeenCalledWith();
      const fromArg = mockDb.select.mock.results[0].value.from.mock.calls[0][0];
      expect(fromArg).toBe(userJob);

      const conditions = where.mock.calls[0][0].queryChunks;
      expect(conditions.length).toBeGreaterThan(0);
      const whereSql = renderSql(where.mock.calls[0][0]);
      expect(whereSql).toContain('"user_id"');
      expect(whereSql).toContain('"query_hash"');
      expect(whereSql).toContain('"listing_url" not in');
      expect(whereSql).toContain('"id" not in');

      expect(result).toEqual(rows);
    });

    it("returns [] for non-positive limit without querying", async () => {
      const mockDb = buildMockDb();
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.listUnlanded({
        userId: "user-1",
        excludeUrls: [],
        excludeJobIds: [],
        limit: 0
      });

      expect(mockDb.select).not.toHaveBeenCalled();
      expect(result).toEqual([]);
    });
  });

  describe("countUnlanded", () => {
    it("counts with the same filters without limit", async () => {
      const where = vi.fn().mockResolvedValue([{ count: 7 }]);
      const mockDb = buildMockDb();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.countUnlanded({
        userId: "user-1",
        excludeUrls: [],
        excludeJobIds: [],
        limit: 25
      });

      expect(mockDb.select).toHaveBeenCalledWith({ count: expect.anything() });
      expect(result).toBe(7);
    });
  });

  describe("purgeStale", () => {
    it("deletes stale rows not referenced by application.jobId and returns deleted count", async () => {
      const referencedSelect = vi.fn();
      const referencedFrom = vi.fn().mockReturnValue({ where: vi.fn() });
      const mockDb = buildMockDb();
      const where = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: "uj-1" }, { id: "uj-2" }])
      });
      mockDb.delete.mockReturnValue({ where });

      const referencedDb = {
        select: referencedSelect.mockReturnValue({ from: referencedFrom })
      };
      mockGetDb.mockReturnValueOnce(referencedDb as never).mockReturnValueOnce(mockDb as never);

      const cutoff = new Date("2026-01-01T00:00:00Z");
      const result = await userJobRepository.purgeStale(cutoff);

      expect(referencedSelect).toHaveBeenCalledWith({ id: application.id });
      expect(referencedFrom).toHaveBeenCalledWith(application);

      expect(mockDb.delete).toHaveBeenCalledWith(userJob);
      const deleteSql = renderSql(where.mock.calls[0][0]);
      expect(deleteSql).toContain('"last_seen_at" <');
      expect(deleteSql).toContain("not exists");
      expect(result).toBe(2);
    });
  });

  describe("countByUser", () => {
    it("counts rows for the user", async () => {
      const where = vi.fn().mockResolvedValue([{ count: 3 }]);
      const mockDb = buildMockDb();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.countByUser("user-1");

      expect(result).toBe(3);
    });
  });

  describe("findById", () => {
    it("returns the row when found", async () => {
      const found = row();
      const where = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([found]) });
      const mockDb = buildMockDb();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.findById("uj-1");

      expect(result).toEqual(found);
    });

    it("returns null when not found", async () => {
      const where = vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue([]) });
      const mockDb = buildMockDb();
      mockDb.select.mockReturnValue({ from: vi.fn().mockReturnValue({ where }) });
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await userJobRepository.findById("missing");

      expect(result).toBeNull();
    });
  });
});
