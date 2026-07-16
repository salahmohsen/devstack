import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  type CreateStackDependencyData,
  stackDependencyRepository
} from "#@/repositories/stack-dependency.repository";
import { stackDependency } from "#@/schema/stack-dependency.schema";

vi.mock("#@/index", () => {
  return {
    getDb: vi.fn()
  };
});

import { getDb } from "#@/index";

const mockGetDb = vi.mocked(getDb);

function buildMockDb() {
  const mockFindFirst = vi.fn();
  const mockFindMany = vi.fn();
  const mockDelete = vi.fn();

  return {
    query: {
      stackDependency: {
        findFirst: mockFindFirst,
        findMany: mockFindMany
      }
    },
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoNothing: vi.fn().mockResolvedValue(undefined)
      })
    }),
    delete: vi.fn().mockReturnValue({
      where: mockDelete.mockResolvedValue(undefined)
    }),
    _mocks: { mockFindFirst, mockFindMany, mockDelete }
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("stackDependencyRepository", () => {
  const input: CreateStackDependencyData = {
    stackId: "stack-1",
    npmPackage: "react"
  };

  describe("upsert", () => {
    it("should insert via onConflictDoNothing then re-find the row", async () => {
      const mockDb = buildMockDb();
      const insertedRow = { id: "new-id", ...input, createdAt: new Date(), updatedAt: new Date() };
      mockDb.query.stackDependency.findFirst.mockResolvedValue(insertedRow);
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await stackDependencyRepository.upsert(input);

      expect(mockDb.insert).toHaveBeenCalledWith(stackDependency);
      const valuesChain = mockDb.insert.mock.results[0].value;
      expect(valuesChain.values).toHaveBeenCalled();
      const onConflictChain = valuesChain.values.mock.results[0].value;
      expect(onConflictChain.onConflictDoNothing).toHaveBeenCalledWith({
        target: stackDependency.npmPackage
      });
      expect(result).toEqual({
        id: "new-id",
        ...input,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it("should return the existing row on duplicate (idempotent)", async () => {
      const mockDb = buildMockDb();
      const existingRow = {
        id: "existing-id",
        ...input,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockDb.query.stackDependency.findFirst.mockResolvedValue(existingRow);
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await stackDependencyRepository.upsert(input);

      expect(result).toEqual({
        id: "existing-id",
        ...input,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it("returns undefined if row deleted between insert and re-find", async () => {
      const mockDb = buildMockDb();
      mockDb.query.stackDependency.findFirst.mockResolvedValue(undefined);
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await stackDependencyRepository.upsert(input);

      expect(result).toBeUndefined();
    });
  });

  describe("findByStackId", () => {
    it("should query with findMany using the given stackId", async () => {
      const mockDb = buildMockDb();
      const rows = [
        {
          id: "1",
          stackId: "stack-1",
          npmPackage: "react",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      mockDb.query.stackDependency.findMany.mockResolvedValue(rows);
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await stackDependencyRepository.findByStackId("stack-1");

      expect(mockDb.query.stackDependency.findMany).toHaveBeenCalledWith({
        where: { stackId: "stack-1" }
      });
      expect(result).toEqual([
        {
          id: "1",
          stackId: "stack-1",
          npmPackage: "react",
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date)
        }
      ]);
    });

    it("should return empty array for non-existent stack", async () => {
      const mockDb = buildMockDb();
      mockDb.query.stackDependency.findMany.mockResolvedValue([]);
      mockGetDb.mockReturnValue(mockDb as never);

      const result = await stackDependencyRepository.findByStackId("non-existent");

      expect(result).toEqual([]);
    });
  });

  describe("deleteByStackId", () => {
    it("should delete all dependencies matching the given stackId", async () => {
      const mockDb = buildMockDb();
      mockGetDb.mockReturnValue(mockDb as never);

      await stackDependencyRepository.deleteByStackId("stack-1");

      expect(mockDb.delete).toHaveBeenCalledWith(stackDependency);
    });

    it("should be idempotent when deleting non-existent stack", async () => {
      const mockDb = buildMockDb();
      mockGetDb.mockReturnValue(mockDb as never);

      await expect(
        stackDependencyRepository.deleteByStackId("non-existent")
      ).resolves.toBeUndefined();
    });
  });
});
