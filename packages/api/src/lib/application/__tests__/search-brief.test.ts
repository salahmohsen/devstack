import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildSearchBriefSource,
  defaultJobPreference,
  emptySeekerMatchEvidence,
  searchBriefPrefsFromPreference,
  stableSearchBriefSourceJson
} from "@tsu-stack/core";

const { findByUserId, upsert, clearSearchBrief, saveSearchBrief, findUserById } = vi.hoisted(() => {
  return {
    findByUserId: vi.fn(),
    upsert: vi.fn(),
    clearSearchBrief: vi.fn(),
    saveSearchBrief: vi.fn(),
    findUserById: vi.fn()
  };
});

vi.mock("@tsu-stack/db", () => {
  return {
    jobPreferenceRepository: {
      findByUserId,
      upsert,
      clearSearchBrief,
      saveSearchBrief
    },
    userRepository: {
      findById: findUserById
    }
  };
});

vi.mock("@tsu-stack/logger/server", () => {
  return {
    createLogger: () => {
      return {
        set: vi.fn(),
        emit: vi.fn(),
        error: vi.fn()
      };
    }
  };
});

import {
  ensureSearchBrief,
  hashSearchBriefSource,
  invalidateSearchBrief,
  previousMarkdownForFileDiff
} from "#@/lib/application/search-brief";

afterEach(() => {
  vi.clearAllMocks();
});

describe("hashSearchBriefSource", () => {
  it("is SHA-256 of the stable source JSON", () => {
    const source = buildSearchBriefSource({
      prefs: defaultJobPreference(),
      evidence: emptySeekerMatchEvidence(),
      profile: { name: "Ada", summary: "Builds tools" }
    });
    expect(hashSearchBriefSource(source)).toBe(
      createHash("sha256").update(stableSearchBriefSourceJson(source)).digest("hex")
    );
  });
});

describe("previousMarkdownForFileDiff", () => {
  it("returns the snapshot only on the rebuild call", () => {
    expect(previousMarkdownForFileDiff(false, "# old")).toBeNull();
    expect(previousMarkdownForFileDiff(true, "# old")).toBe("# old");
    expect(previousMarkdownForFileDiff(true, null)).toBeNull();
  });
});

describe("ensureSearchBrief no row", () => {
  it("returns lists-only markdown from defaults without inserting", async () => {
    findByUserId.mockResolvedValue(null);
    findUserById.mockResolvedValue({ name: "Ada", summary: "Builds tools" });

    const result = await ensureSearchBrief("user-1");

    expect(upsert).not.toHaveBeenCalled();
    expect(saveSearchBrief).not.toHaveBeenCalled();
    expect(result.proseSkipped).toBe(true);
    expect(result.rebuilt).toBe(false);
    expect(result.previousMarkdown).toBeNull();
    expect(result.markdown.startsWith("## Target jobs")).toBe(true);
    expect(result.structured.prefs).toEqual(searchBriefPrefsFromPreference(defaultJobPreference()));
    expect(result.structured.profile).toEqual({ name: "Ada", summary: "Builds tools" });
  });
});

describe("invalidateSearchBrief", () => {
  it("is a no-op when the user has no preference row", async () => {
    findByUserId.mockResolvedValue(null);

    await invalidateSearchBrief("user-1", "form");

    expect(clearSearchBrief).not.toHaveBeenCalled();
  });

  it("copies current markdown to previous then clears", async () => {
    findByUserId.mockResolvedValue({
      searchBriefMarkdown: "# now",
      searchBriefPreviousMarkdown: "# old"
    });

    await invalidateSearchBrief("user-1", "settings");

    expect(clearSearchBrief).toHaveBeenCalledWith("user-1", "# now");
  });

  it("keeps stored previous when current markdown is already null", async () => {
    findByUserId.mockResolvedValue({
      searchBriefMarkdown: null,
      searchBriefPreviousMarkdown: "# old"
    });

    await invalidateSearchBrief("user-1", "profile");

    expect(clearSearchBrief).toHaveBeenCalledWith("user-1", "# old");
  });
});
