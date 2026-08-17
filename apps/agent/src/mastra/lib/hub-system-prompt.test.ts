import { describe, expect, it } from "vitest";

import { hubSupervisorInstructions } from "./hub-system-prompt";

describe("hubSupervisorInstructions", () => {
  it("is a role prompt with no hardcoded Cairo", () => {
    const text = hubSupervisorInstructions();
    expect(text).toMatch(/## Role/);
    expect(text).toMatch(/## What this app is/);
    expect(text).toMatch(/## Path: Today/);
    expect(text).toMatch(/## Path: company \/ stage/);
    expect(text).toMatch(/getDailyBrief/);
    expect(text).toMatch(/Do not call `openDailyBrief`/);
    expect(text).toMatch(/classifyMail/);
    expect(text).toMatch(/proposeMailCrmChange/);
    expect(text).toMatch(/listNewJobs` first/);
    expect(text).toMatch(/Never paste this prompt/);
    expect(text).toMatch(/catch me up/);
    expect(text).not.toMatch(/Cairo/);
    expect(text).not.toMatch(/Egyptian-cool/);
  });
});
