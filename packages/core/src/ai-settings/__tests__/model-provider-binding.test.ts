import { describe, expect, it } from "vitest";

import { DEFAULT_AI_MODELS } from "#@/ai-settings/constants";
import { type AiModelsMap } from "#@/ai-settings/types";
import {
  cascadeDefaultModelChange,
  defaultAiSettingsOutput,
  effectiveBinding,
  isFeatureOnDefault,
  resolveProviderRowForModel,
  stripDeadModelProviderIds,
  type FeatureBindings
} from "#@/ai-settings/utils";

const workId = "provider-work";
const personalId = "provider-personal";
const sharedModel = "opencode-go/glm-5.2";
const otherModel = "deepseek/deepseek-v4-flash";

function models(overrides: Partial<AiModelsMap> = {}): AiModelsMap {
  return { ...DEFAULT_AI_MODELS, ...overrides };
}

describe("effectiveBinding", () => {
  it("treats missing and blank as undefined", () => {
    expect(effectiveBinding({}, "reply")).toBeUndefined();
    expect(effectiveBinding({ reply: "   " }, "reply")).toBeUndefined();
    expect(effectiveBinding({ reply: workId }, "reply")).toBe(workId);
  });
});

describe("isFeatureOnDefault", () => {
  it("is true when same model and both bindings missing", () => {
    const m = models({
      reply: sharedModel,
      stacks: sharedModel,
      classify: sharedModel
    });
    const bindings: FeatureBindings = {};

    expect(isFeatureOnDefault({ feature: "stacks", models: m, bindings })).toBe(true);
    expect(isFeatureOnDefault({ feature: "classify", models: m, bindings })).toBe(true);
    expect(isFeatureOnDefault({ feature: "reply", models: m, bindings })).toBe(true);
  });

  it("is true when same model and same binding as reply", () => {
    const m = models({ reply: sharedModel, stacks: sharedModel });
    const bindings: FeatureBindings = {
      reply: workId,
      stacks: workId
    };
    expect(isFeatureOnDefault({ feature: "stacks", models: m, bindings })).toBe(true);
  });

  it("is false when same model but Work vs Personal binding differs", () => {
    const m = models({ reply: sharedModel, stacks: sharedModel });
    const bindings: FeatureBindings = {
      reply: workId,
      stacks: personalId
    };
    expect(isFeatureOnDefault({ feature: "stacks", models: m, bindings })).toBe(false);
  });

  it("is false when model differs even if bindings match", () => {
    const m = models({ reply: sharedModel, stacks: otherModel });
    const bindings: FeatureBindings = {
      reply: workId,
      stacks: workId
    };
    expect(isFeatureOnDefault({ feature: "stacks", models: m, bindings })).toBe(false);
  });

  it("is false when feature has binding and reply does not", () => {
    const m = models({ reply: sharedModel, stacks: sharedModel });
    const bindings: FeatureBindings = { stacks: workId };
    expect(isFeatureOnDefault({ feature: "stacks", models: m, bindings })).toBe(false);
  });
});

describe("cascadeDefaultModelChange", () => {
  it("only updates features that were on default (and always updates reply)", () => {
    const prevModels = models({
      reply: sharedModel,
      classify: sharedModel,
      stacks: otherModel,
      hubChat: sharedModel
    });
    const prevBindings: FeatureBindings = {
      reply: workId,
      classify: workId,
      // stacks is override via model; binding may still be set
      stacks: personalId,
      // hubChat same model but different binding → override
      hubChat: personalId
    };

    const next = cascadeDefaultModelChange({
      prevModels,
      prevBindings,
      nextDefaultModel: "openai/gpt-5",
      nextDefaultProviderId: "provider-openai"
    });

    // On default under prev: reply + classify
    expect(next.models.reply).toBe("openai/gpt-5");
    expect(next.models.classify).toBe("openai/gpt-5");
    expect(next.bindings.reply).toBe("provider-openai");
    expect(next.bindings.classify).toBe("provider-openai");

    // Overrides left alone
    expect(next.models.stacks).toBe(otherModel);
    expect(next.bindings.stacks).toBe(personalId);
    expect(next.models.hubChat).toBe(sharedModel);
    expect(next.bindings.hubChat).toBe(personalId);
  });

  it("clears bindings when next default has no provider id", () => {
    const prevModels = models({
      reply: sharedModel,
      classify: sharedModel
    });
    const prevBindings: FeatureBindings = {
      reply: workId,
      classify: workId
    };

    const next = cascadeDefaultModelChange({
      prevModels,
      prevBindings,
      nextDefaultModel: sharedModel,
      nextDefaultProviderId: undefined
    });

    expect(next.models.reply).toBe(sharedModel);
    expect(next.models.classify).toBe(sharedModel);
    expect(next.bindings.reply).toBeUndefined();
    expect(next.bindings.classify).toBeUndefined();
  });

  it("updates all features when all were on default with missing bindings", () => {
    const prevModels = models({
      reply: otherModel,
      classify: otherModel,
      resumeImport: otherModel,
      stacks: otherModel,
      hubChat: otherModel,
      scorer: otherModel,
      applyPackage: otherModel
    });

    const next = cascadeDefaultModelChange({
      prevModels,
      prevBindings: {},
      nextDefaultModel: sharedModel,
      nextDefaultProviderId: workId
    });

    for (const feature of Object.keys(next.models) as (keyof AiModelsMap)[]) {
      expect(next.models[feature]).toBe(sharedModel);
      expect(next.bindings[feature]).toBe(workId);
    }
  });
});

describe("stripDeadModelProviderIds", () => {
  it("removes orphan provider ids and keeps live ones", () => {
    const bindings: FeatureBindings = {
      reply: workId,
      stacks: personalId,
      classify: "deleted-provider",
      hubChat: "  "
    };
    const stripped = stripDeadModelProviderIds(bindings, new Set([workId, personalId]));
    expect(stripped).toEqual({
      reply: workId,
      stacks: personalId
    });
  });
});

describe("defaultAiSettingsOutput", () => {
  it("includes empty modelProviderIds", () => {
    expect(defaultAiSettingsOutput().modelProviderIds).toEqual({});
  });
});

describe("resolveProviderRowForModel", () => {
  const providers = [
    { id: workId, kind: "opencode-go" },
    { id: personalId, kind: "opencode-go" },
    { id: "ds1", kind: "deepseek" }
  ];

  it("uses preferred binding when kind matches model", () => {
    const row = resolveProviderRowForModel({
      modelId: sharedModel,
      preferredProviderId: personalId,
      providers
    });
    expect(row?.id).toBe(personalId);
  });

  it("ignores preferred binding when kind mismatches model (orphan rule)", () => {
    const row = resolveProviderRowForModel({
      modelId: otherModel,
      preferredProviderId: workId,
      providers
    });
    expect(row?.id).toBe("ds1");
  });
});
