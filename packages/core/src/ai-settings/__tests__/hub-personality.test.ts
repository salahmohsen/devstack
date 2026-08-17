import { describe, expect, it } from "vitest";

import {
  HUB_PERSONALITIES,
  hubPersonalityById,
  parseHubPersonalityId
} from "#@/ai-settings/hub-personality";

describe("hub personalities", () => {
  it("keeps four voice-only briefs with no shared product glossary", () => {
    expect(HUB_PERSONALITIES.map((row) => row.id)).toEqual(["cairo", "dry", "coach", "quiet"]);
    for (const row of HUB_PERSONALITIES) {
      expect(row.prompt).toContain("Voice:");
      expect(row.prompt).toContain("Today letter");
      expect(row.prompt).toContain("What's Trivelta's stage?");
      expect(row.prompt).not.toMatch(/Product language/i);
      expect(row.prompt).not.toMatch(/Career Inbox/);
      expect(row.prompt).not.toMatch(/tracked jobs/);
    }
  });

  it("makes the four voices recognizably different", () => {
    const cairo = hubPersonalityById("cairo").prompt;
    const dry = hubPersonalityById("dry").prompt;
    const coach = hubPersonalityById("coach").prompt;
    const quiet = hubPersonalityById("quiet").prompt;
    expect(cairo).toMatch(/actual jokes/i);
    expect(dry).toMatch(/headings and bullets/i);
    expect(coach).toMatch(/next action first/i);
    expect(quiet).toMatch(/one or two sentences/i);
    expect(new Set([cairo, dry, coach, quiet]).size).toBe(4);
  });

  it("parses ids and falls back to Cairo", () => {
    expect(parseHubPersonalityId("dry")).toBe("dry");
    expect(parseHubPersonalityId("nope")).toBe(null);
    expect(hubPersonalityById("nope").id).toBe("cairo");
  });
});
