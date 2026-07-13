import { describe, expect, it } from "vitest";

import {
  type CreateStackDependencyData,
  stackDependencyRepository
} from "#@/repositories/stack-dependency.repository";

describe("stackDependencyRepository", () => {
  describe("types", () => {
    it("should export CreateStackDependencyData type", () => {
      const _test: CreateStackDependencyData = {
        stackId: "test-stack-id",
        npmPackage: "test-package"
      };
      expect(_test.stackId).toBe("test-stack-id");
      expect(_test.npmPackage).toBe("test-package");
    });
  });

  describe("repository methods", () => {
    it("should have findByStackId method", () => {
      expect(typeof stackDependencyRepository.findByStackId).toBe("function");
    });

    it("should have upsert method", () => {
      expect(typeof stackDependencyRepository.upsert).toBe("function");
    });

    it("should have deleteByStackId method", () => {
      expect(typeof stackDependencyRepository.deleteByStackId).toBe("function");
    });

    it("should have findByNpmPackage method", () => {
      expect(typeof stackDependencyRepository.findByNpmPackage).toBe("function");
    });

    it("should have findManyByNpmPackages method", () => {
      expect(typeof stackDependencyRepository.findManyByNpmPackages).toBe("function");
    });

    it("should have findById method", () => {
      expect(typeof stackDependencyRepository.findById).toBe("function");
    });

    it("should have create method", () => {
      expect(typeof stackDependencyRepository.create).toBe("function");
    });

    it("should have createMany method", () => {
      expect(typeof stackDependencyRepository.createMany).toBe("function");
    });
  });
});
