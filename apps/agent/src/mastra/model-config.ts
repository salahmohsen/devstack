/**
 * Centralized model configuration.
 * Change models/retries here — all agents and workflows pick up the change.
 */

export const MODEL_PRESETS = {
  /** Balanced: fast model first, fallback for quality */
  default: [
    // DeepSeek API currently accepts only deepseek-v4-flash | deepseek-v4-pro.
    { model: "deepseek/deepseek-v4-flash", maxRetries: 1 }
    // { model: "opencode/deepseek-v4-flash-free", maxRetries: 1 },
    // { model: "opencode/big-pickle", maxRetries: 2 },
  ],

  /** Quality-first: stronger model first */
  qualityFirst: [
    { model: "deepseek/deepseek-v4-pro", maxRetries: 1 }
    // { model: "opencode/deepseek-v4-flash", maxRetries: 1 },
    // { model: "opencode/big-pickle", maxRetries: 2 }
  ],

  /** Full fallback chain (hub supervisor and multi-step agents) */
  fullChain: [
    { model: "deepseek/deepseek-v4-flash", maxRetries: 1 }
    // { model: "deepseek/deepseek-v4-pro", maxRetries: 1 },
    // { model: "opencode/big-pickle", maxRetries: 1 },
    // { model: "opencode/deepseek-v4-flash-free", maxRetries: 1 },
    // { model: "nvidia/nemotron-nano-9b-v2:free", maxRetries: 2 },
    // { model: "openrouter/google/gemma-4-26b-a4b-it:free", maxRetries: 2 }
  ]
};

export type ModelPreset = keyof typeof MODEL_PRESETS;
