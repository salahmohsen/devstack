import { describe, expect, it } from "vitest";

import { DEFAULT_AI_MODELS } from "#@/ai-settings/constants";
import {
  getMastraProvider,
  isMastraModelDeprecated,
  parseMastraModelId,
  toMastraModelId
} from "#@/ai-settings/mastra-provider-catalog";
import { pickProbeModelId } from "#@/ai-settings/utils";

describe("toMastraModelId", () => {
  it("prefixes bare model slugs", () => {
    expect(toMastraModelId("deepseek", "deepseek-v4-flash")).toBe("deepseek/deepseek-v4-flash");
  });

  it("namespaces multi-segment provider slugs (openrouter anthropic/...)", () => {
    expect(toMastraModelId("openrouter", "anthropic/claude-fable-5")).toBe(
      "openrouter/anthropic/claude-fable-5"
    );
  });

  it("namespaces ~ alias slugs (openrouter ~anthropic/...-latest)", () => {
    expect(toMastraModelId("openrouter", "~anthropic/claude-fable-latest")).toBe(
      "openrouter/~anthropic/claude-fable-latest"
    );
  });

  it("passes through ids already prefixed with the provider", () => {
    expect(toMastraModelId("openrouter", "openrouter/auto")).toBe("openrouter/auto");
  });
});

describe("pickProbeModelId", () => {
  it("returns a provider-prefixed catalog model for openrouter (first catalog entry is a ~ alias)", () => {
    const id = pickProbeModelId("openrouter", {});
    expect(id).toBeTruthy();
    expect(id!.startsWith("openrouter/")).toBe(true);
    // Mastra must parse the provider segment as openrouter, not ~anthropic
    // (unprefixed ~anthropic/... caused "No API URL found" in ModelsDevGateway).
    expect(id!.split("/")[0]).toBe("openrouter");
  });

  it("prefers a user model bound to the provider kind", () => {
    expect(
      pickProbeModelId("openrouter", {
        models: { reply: "openrouter/z-ai/glm-4.7" }
      })
    ).toBe("openrouter/z-ai/glm-4.7");
  });

  it("returns null for custom providers without an override", () => {
    expect(pickProbeModelId("custom", {})).toBeNull();
  });
});

describe("pickProbeModelId default selection", () => {
  it("skips non-chat and free-tier models", () => {
    for (const kind of ["opencode", "nvidia", "openrouter", "deepseek"]) {
      const id = pickProbeModelId(kind, {})!;
      expect(id).toBeTruthy();
      expect(id).not.toMatch(/flux|image|embed|:free|-free$|\/~|-latest$/i);
    }
  });

  it("picks a cheap chat model, not the vision-exp variant", () => {
    expect(pickProbeModelId("deepseek", {})).toMatch(/^deepseek\/deepseek-(v4-)?flash$/);
  });
});

describe("default models", () => {
  it("are listed in the catalog and not deprecated by Mastra", () => {
    for (const modelId of new Set(Object.values(DEFAULT_AI_MODELS))) {
      const { provider, model } = parseMastraModelId(modelId);
      expect(getMastraProvider(provider!)?.models).toContain(model);
      expect(isMastraModelDeprecated(modelId)).toBe(false);
    }
  });
});
