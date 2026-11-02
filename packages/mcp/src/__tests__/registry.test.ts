import { describe, expect, it } from "vitest";

import { assertRegistryResolves, TOOLS, toToolName } from "#@/registry";

describe("toToolName", () => {
  it("snake-cases a dotted path", () => {
    expect(toToolName("applications.updateStage")).toBe("applications_update_stage");
    expect(toToolName("jobDiscovery.findNow")).toBe("job_discovery_find_now");
  });
});

describe("TOOLS", () => {
  it("has unique names under 64 chars", () => {
    const names = TOOLS.map((tool) => tool.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names.every((name) => name.length <= 64)).toBe(true);
  });

  it("gates every send and every delete", () => {
    const effectOf = (path: string) => TOOLS.find((tool) => tool.path === path)?.effect;
    expect(effectOf("applications.sendOutreach")).toBe("outbound");
    expect(effectOf("mail.sendReply")).toBe("outbound");
    expect(effectOf("applications.acceptApplyPackage")).toBe("outbound");
    for (const tool of TOOLS.filter((t) => /\.(delete|remove)[A-Z]?\w*$/.test(t.path))) {
      expect(tool.effect).toBe("destructive");
    }
  });
});

describe("assertRegistryResolves", () => {
  const fakeProcedure = { "~orpc": {} };

  it("passes when every path exists", () => {
    const router: Record<string, Record<string, unknown>> = {};
    for (const tool of TOOLS) {
      const [group, name] = tool.path.split(".") as [string, string];
      (router[group] ??= {})[name] = fakeProcedure;
    }
    expect(() => assertRegistryResolves(router)).not.toThrow();
  });

  it("throws and names the missing path", () => {
    expect(() => assertRegistryResolves({})).toThrow(/applications\.list/);
  });
});
