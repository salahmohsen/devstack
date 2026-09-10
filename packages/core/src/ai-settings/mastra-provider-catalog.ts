/**
 * Generated from @mastra/core provider-registry.json (installed agent version)
 * plus models.dev per-model capability data.
 * Do not hand-edit model lists — re-run:
 *   pnpm mastra:sync-catalog
 * CI runs this script with --check and fails when this file is stale.
 *
 * Model router format: "provider/model-name"
 */

export type MastraProviderCatalogEntry = {
  id: string;
  name: string;
  /** Env vars Mastra accepts for this provider's API key. */
  apiKeyEnvVars: readonly string[];
  models: readonly string[];
};

export const MASTRA_PROVIDER_CATALOG = [
  {
    id: "302ai",
    name: "302.AI",
    apiKeyEnvVars: ["302AI_API_KEY"],
    models: [
      "chatgpt-4o-latest",
      "claude-3-5-haiku-20241022",
      "claude-3-5-haiku-latest",
      "claude-haiku-4-5",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-1-20250805",
      "claude-opus-4-1-20250805-thinking",
      "claude-opus-4-20250514",
      "claude-opus-4-5",
      "claude-opus-4-5-20251101",
      "claude-opus-4-5-20251101-thinking",
      "claude-opus-4-6",
      "claude-opus-4-6-thinking",
      "claude-opus-4-7",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-5",
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-5-20250929-thinking",
      "claude-sonnet-4-6",
      "claude-sonnet-4-6-thinking",
      "deepseek-chat",
      "deepseek-reasoner",
      "deepseek-v3.2",
      "deepseek-v3.2-thinking",
      "doubao-seed-1-6-thinking-250715",
      "doubao-seed-1-6-vision-250815",
      "doubao-seed-1-8-251215",
      "doubao-seed-code-preview-251028",
      "gemini-2.0-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-lite-preview-09-2025",
      "gemini-2.5-flash-nothink",
      "gemini-2.5-flash-preview-09-2025",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-3-pro-image-preview",
      "gemini-3-pro-preview",
      "gemini-3.1-flash-image-preview",
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-airx",
      "glm-4.5-x",
      "glm-4.5v",
      "glm-4.6",
      "glm-4.6v",
      "glm-4.7",
      "glm-4.7-flashx",
      "glm-5",
      "glm-5-turbo",
      "glm-5.1",
      "glm-5v-turbo",
      "glm-for-coding",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-pro",
      "gpt-5-thinking",
      "gpt-5.1",
      "gpt-5.1-chat-latest",
      "gpt-5.2",
      "gpt-5.2-chat-latest",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-mini-2026-03-17",
      "gpt-5.4-nano",
      "gpt-5.4-nano-2026-03-17",
      "gpt-5.4-pro",
      "grok-4-1-fast-non-reasoning",
      "grok-4-1-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-4-fast-reasoning",
      "grok-4.1",
      "grok-4.20-beta-0309-non-reasoning",
      "grok-4.20-beta-0309-reasoning",
      "grok-4.20-multi-agent-beta-0309",
      "kimi-k2-0905-preview",
      "kimi-k2-thinking",
      "kimi-k2-thinking-turbo",
      "MiniMax-M1",
      "MiniMax-M2",
      "MiniMax-M2.1",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "ministral-14b-2512",
      "mistral-large-2512",
      "qwen-flash",
      "qwen-max-latest",
      "qwen-plus",
      "qwen3-235b-a22b",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-30b-a3b",
      "qwen3-coder-480b-a35b-instruct",
      "qwen3-max-2025-09-23"
    ]
  },
  {
    id: "abacus",
    name: "Abacus",
    apiKeyEnvVars: ["ABACUS_API_KEY"],
    models: [
      "claude-3-7-sonnet-20250219",
      "claude-fable-5",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-1-20250805",
      "claude-opus-4-20250514",
      "claude-opus-4-5-20251101",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3.1-Terminus",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek/deepseek-v3.1",
      "gemini-2.5-flash",
      "gemini-2.5-flash-image",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-3-pro-image",
      "gemini-3-pro-image-preview",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "google/gemma-4-31b-it",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-2024-11-20",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-codex",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.1-chat-latest",
      "gpt-5.1-codex",
      "gpt-5.1-codex-max",
      "gpt-5.2",
      "gpt-5.2-chat-latest",
      "gpt-5.2-codex",
      "gpt-5.3-chat-latest",
      "gpt-5.3-codex",
      "gpt-5.3-codex-xhigh",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.5",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "grok-4-0709",
      "grok-4-1-fast-non-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-4.3",
      "grok-4.5",
      "grok-4.6",
      "grok-code-fast-1",
      "kimi-k2-turbo-preview",
      "kimi-k2.5",
      "llama-3.3-70b-versatile",
      "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3.1-8B-Instruct",
      "meta-llama/Meta-Llama-3.3-70B-Instruct",
      "mimo-v2-pro",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "muse-spark-1.1",
      "muse-spark-1.2",
      "o3",
      "o3-mini",
      "o3-pro",
      "o4-mini",
      "openai/gpt-oss-120b",
      "qwen-2.5-coder-32b",
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "Qwen/Qwen3.6-27B",
      "Qwen/QwQ-32B",
      "qwen3-max",
      "qwen3.7-max",
      "qwen3.8-max",
      "route-llm",
      "thinkingmachines/Inkling",
      "zai-org/GLM-4.5",
      "zai-org/GLM-4.6",
      "zai-org/GLM-4.7",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2"
    ]
  },
  {
    id: "abliteration-ai",
    name: "abliteration.ai",
    apiKeyEnvVars: ["ABLIT_KEY"],
    models: ["abliterated-model", "abliterated-model-large", "abliterated-model-large-v2"]
  },
  {
    id: "above",
    name: "above.dev",
    apiKeyEnvVars: ["ABOVE_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "glm-5.2",
      "glm-5.2-fast",
      "glm-5.3-flash",
      "mimo-v2.5-pro",
      "mimo-v2.5-pro-ultraspeed",
      "qwen3.8-max"
    ]
  },
  {
    id: "agentrouter",
    name: "AgentRouter",
    apiKeyEnvVars: ["AGENTROUTER_API_KEY"],
    models: ["claude-opus-4-8", "claude-opus-5", "gpt-5.6-sol"]
  },
  {
    id: "agnes",
    name: "Agnes AI",
    apiKeyEnvVars: ["AGNES_API_KEY"],
    models: ["agnes-2.0-flash", "agnes-2.5-flash", "agnes-2.5-pro-alpha"]
  },
  {
    id: "ai-router",
    name: "AI-ROUTER",
    apiKeyEnvVars: ["AI_ROUTER_API_KEY"],
    models: ["gpt-5.4", "gpt-5.5", "gpt-5.6-luna", "gpt-5.6-sol", "gpt-5.6-terra"]
  },
  {
    id: "aiand",
    name: "ai&",
    apiKeyEnvVars: ["AIAND_API_KEY"],
    models: [
      "deepseek-ai/deepseek-v4-flash",
      "deepseek-ai/deepseek-v4-pro",
      "google/gemma-4-31b-it",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k3",
      "motif-technologies/motif-3",
      "openai/gpt-oss-120b",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.8-27b",
      "zai-org/glm-5.2",
      "zai-org/glm-5.3"
    ]
  },
  {
    id: "aixy",
    name: "Aixy",
    apiKeyEnvVars: ["AIXY_API_KEY"],
    models: ["openai/gpt-4.1-mini"]
  },
  {
    id: "aki-io",
    name: "AKI.IO",
    apiKeyEnvVars: ["AKI_IO_API_KEY"],
    models: [
      "deepseek-v4-flash-0731-284b",
      "gemma4-26b",
      "gpt-oss-120b",
      "kimi-k2.7-code-1100b",
      "mistral4-119b",
      "qwen3.6-35b",
      "qwen3.8-27b"
    ]
  },
  {
    id: "alibaba",
    name: "Alibaba",
    apiKeyEnvVars: ["DASHSCOPE_API_KEY"],
    models: [
      "deepseek-v4-flash-0731",
      "glm-5.2",
      "qvq-max",
      "qwen-flash",
      "qwen-max",
      "qwen-mt-plus",
      "qwen-mt-turbo",
      "qwen-omni-turbo",
      "qwen-omni-turbo-realtime",
      "qwen-plus",
      "qwen-plus-character-ja",
      "qwen-turbo",
      "qwen-vl-max",
      "qwen-vl-ocr",
      "qwen-vl-plus",
      "qwen2-5-14b-instruct",
      "qwen2-5-32b-instruct",
      "qwen2-5-72b-instruct",
      "qwen2-5-7b-instruct",
      "qwen2-5-omni-7b",
      "qwen2-5-vl-72b-instruct",
      "qwen2-5-vl-7b-instruct",
      "qwen3-14b",
      "qwen3-235b-a22b",
      "qwen3-32b",
      "qwen3-8b",
      "qwen3-asr-flash",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-coder-480b-a35b-instruct",
      "qwen3-coder-flash",
      "qwen3-coder-plus",
      "qwen3-livetranslate-flash-realtime",
      "qwen3-max",
      "qwen3-next-80b-a3b-instruct",
      "qwen3-next-80b-a3b-thinking",
      "qwen3-omni-flash",
      "qwen3-omni-flash-realtime",
      "qwen3-vl-235b-a22b",
      "qwen3-vl-30b-a3b",
      "qwen3-vl-plus",
      "qwen3.5-122b-a10b",
      "qwen3.5-27b",
      "qwen3.5-35b-a3b",
      "qwen3.5-397b-a17b",
      "qwen3.5-plus",
      "qwen3.6-27b",
      "qwen3.6-35b-a3b",
      "qwen3.6-flash",
      "qwen3.6-max-preview",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-flash",
      "qwen3.8-max",
      "qwq-plus"
    ]
  },
  {
    id: "alibaba-cn",
    name: "Alibaba (China)",
    apiKeyEnvVars: ["DASHSCOPE_API_KEY"],
    models: [
      "deepseek-r1",
      "deepseek-r1-0528",
      "deepseek-r1-distill-llama-70b",
      "deepseek-r1-distill-llama-8b",
      "deepseek-r1-distill-qwen-1-5b",
      "deepseek-r1-distill-qwen-14b",
      "deepseek-r1-distill-qwen-32b",
      "deepseek-r1-distill-qwen-7b",
      "deepseek-v3",
      "deepseek-v3-1",
      "deepseek-v3-2-exp",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "kimi-k2-thinking",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi/kimi-k2.5",
      "MiniMax-M2.5",
      "MiniMax/MiniMax-M2.7",
      "moonshot-kimi-k2-instruct",
      "qvq-max",
      "qwen-deep-research",
      "qwen-doc-turbo",
      "qwen-flash",
      "qwen-long",
      "qwen-math-plus",
      "qwen-math-turbo",
      "qwen-max",
      "qwen-mt-plus",
      "qwen-mt-turbo",
      "qwen-omni-turbo",
      "qwen-omni-turbo-realtime",
      "qwen-plus",
      "qwen-plus-character",
      "qwen-turbo",
      "qwen-vl-max",
      "qwen-vl-ocr",
      "qwen-vl-plus",
      "qwen2-5-14b-instruct",
      "qwen2-5-32b-instruct",
      "qwen2-5-72b-instruct",
      "qwen2-5-7b-instruct",
      "qwen2-5-coder-32b-instruct",
      "qwen2-5-coder-7b-instruct",
      "qwen2-5-math-72b-instruct",
      "qwen2-5-math-7b-instruct",
      "qwen2-5-omni-7b",
      "qwen2-5-vl-72b-instruct",
      "qwen2-5-vl-7b-instruct",
      "qwen3-14b",
      "qwen3-235b-a22b",
      "qwen3-32b",
      "qwen3-8b",
      "qwen3-asr-flash",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-coder-480b-a35b-instruct",
      "qwen3-coder-flash",
      "qwen3-coder-plus",
      "qwen3-max",
      "qwen3-next-80b-a3b-instruct",
      "qwen3-next-80b-a3b-thinking",
      "qwen3-omni-flash",
      "qwen3-omni-flash-realtime",
      "qwen3-vl-235b-a22b",
      "qwen3-vl-30b-a3b",
      "qwen3-vl-plus",
      "qwen3.5-397b-a17b",
      "qwen3.5-flash",
      "qwen3.5-plus",
      "qwen3.6-flash",
      "qwen3.6-max-preview",
      "qwen3.6-plus",
      "qwen3.7-flash",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-flash",
      "qwen3.8-max",
      "qwq-32b",
      "qwq-plus",
      "siliconflow/deepseek-r1-0528",
      "siliconflow/deepseek-v3-0324",
      "siliconflow/deepseek-v3.1-terminus",
      "siliconflow/deepseek-v3.2",
      "tongyi-intent-detect-v3"
    ]
  },
  {
    id: "alibaba-coding-plan",
    name: "Alibaba Coding Plan",
    apiKeyEnvVars: ["ALIBABA_CODING_PLAN_API_KEY"],
    models: [
      "glm-4.7",
      "glm-5",
      "kimi-k2.5",
      "MiniMax-M2.5",
      "qwen3-coder-next",
      "qwen3-coder-plus",
      "qwen3-max-2026-01-23",
      "qwen3.5-plus",
      "qwen3.6-flash",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus"
    ]
  },
  {
    id: "alibaba-coding-plan-cn",
    name: "Alibaba Coding Plan (China)",
    apiKeyEnvVars: ["ALIBABA_CODING_PLAN_API_KEY"],
    models: [
      "glm-4.7",
      "glm-5",
      "kimi-k2.5",
      "MiniMax-M2.5",
      "qwen3-coder-next",
      "qwen3-coder-plus",
      "qwen3-max-2026-01-23",
      "qwen3.5-plus",
      "qwen3.6-flash",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus"
    ]
  },
  {
    id: "alibaba-token-plan",
    name: "Alibaba Token Plan",
    apiKeyEnvVars: ["ALIBABA_TOKEN_PLAN_API_KEY"],
    models: [
      "deepseek-v3.2",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "happyhorse-1.1-i2v",
      "happyhorse-1.1-r2v",
      "happyhorse-1.1-t2v",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "MiniMax-M2.5",
      "qwen-image-2.0",
      "qwen-image-2.0-pro",
      "qwen3.6-flash",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-flash",
      "qwen3.8-max",
      "qwen3.8-max-preview",
      "wan2.7-image",
      "wan2.7-image-pro"
    ]
  },
  {
    id: "alibaba-token-plan-cn",
    name: "Alibaba Token Plan (China)",
    apiKeyEnvVars: ["ALIBABA_TOKEN_PLAN_API_KEY"],
    models: [
      "deepseek-v3.2",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "happyhorse-1.1-i2v",
      "happyhorse-1.1-r2v",
      "happyhorse-1.1-t2v",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "MiniMax-M2.5",
      "qwen-image-2.0",
      "qwen-image-2.0-pro",
      "qwen3.6-flash",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-flash",
      "qwen3.8-max",
      "qwen3.8-max-preview",
      "wan2.7-image",
      "wan2.7-image-pro"
    ]
  },
  {
    id: "ambient",
    name: "Ambient",
    apiKeyEnvVars: ["AMBIENT_API_KEY"],
    models: [
      "ambient/large",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "stepfun/step-3.7-flash",
      "xiaomi/mimo-v2.5",
      "z-ai/glm-5.2",
      "zai-org/GLM-5.1-FP8",
      "zai-org/GLM-5.2-FP8"
    ]
  },
  {
    id: "amd",
    name: "AMD",
    apiKeyEnvVars: ["AMD_API_KEY"],
    models: [
      "DeepSeek-V4-Flash",
      "DeepSeek-V4-Flash-Vision-Exp",
      "MiniCPM5-1B",
      "Qwen3.8-Flash-Next"
    ]
  },
  {
    id: "anthropic",
    name: "Anthropic",
    apiKeyEnvVars: ["ANTHROPIC_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-fable-5-1",
      "claude-haiku-4-5",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-5",
      "claude-opus-4-5-20251101",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-5",
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-6",
      "claude-sonnet-5"
    ]
  },
  {
    id: "anyapi",
    name: "AnyAPI",
    apiKeyEnvVars: ["ANYAPI_API_KEY"],
    models: [
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-6",
      "cohere/command-r-plus-08-2024",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3-pro-preview",
      "mistralai/devstral-2512",
      "mistralai/mistral-large-2512",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5.1",
      "openai/gpt-5.2",
      "openai/gpt-5.4",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "perplexity/sonar-pro",
      "perplexity/sonar-reasoning-pro",
      "xai/grok-4.3"
    ]
  },
  {
    id: "arcee",
    name: "Arcee",
    apiKeyEnvVars: ["ARCEE_API_KEY"],
    models: [
      "deepseek/deepseek-v4-flash-latest",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "moonshotai/kimi-k3",
      "thinkingmachines/inkling-small",
      "trinity-large-thinking",
      "zai-org/glm-5.2"
    ]
  },
  {
    id: "atomic-chat",
    name: "Atomic Chat",
    apiKeyEnvVars: ["ATOMIC_CHAT_API_KEY"],
    models: [
      "gemma-4-E4B-it-IQ4_XS",
      "gemma-4-E4B-it-MLX-4bit",
      "Meta-Llama-3_1-8B-Instruct-GGUF",
      "Qwen3_5-9B-MLX-4bit",
      "Qwen3_5-9B-Q4_K_M"
    ]
  },
  {
    id: "auriko",
    name: "Auriko",
    apiKeyEnvVars: ["AURIKO_API_KEY"],
    models: [
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-3.1-pro-preview",
      "glm-5.1",
      "grok-4.3",
      "kimi-k2.5",
      "kimi-k2.6",
      "minimax-m2-7",
      "minimax-m2-7-highspeed",
      "qwen-3.6-plus"
    ]
  },
  {
    id: "bailing",
    name: "Bailing",
    apiKeyEnvVars: ["BAILING_API_TOKEN"],
    models: ["Ling-1T", "Ring-1T"]
  },
  {
    id: "baseten",
    name: "Baseten",
    apiKeyEnvVars: ["BASETEN_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "MiniMaxAI/MiniMax-M2.5",
      "moonshotai/Kimi-K2.5",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "nvidia/Nemotron-120B-A12B",
      "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
      "openai/gpt-oss-120b",
      "thinkingmachines/inkling",
      "thinkingmachines/inkling-small",
      "zai-org/GLM-4.7",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.2-Fast",
      "zai-org/GLM-5.3",
      "zai-org/GLM-5.3-Fast",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "berget",
    name: "Berget.AI",
    apiKeyEnvVars: ["BERGET_API_KEY"],
    models: [
      "google/gemma-4-31B-it",
      "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
      "moonshotai/Kimi-K3",
      "Qwen/Qwen3.8-27B-FP8",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "blueclaw",
    name: "Blue Claw",
    apiKeyEnvVars: ["BLUECLAW_API_KEY"],
    models: ["Qwen/Qwen3.6-35B-A3B-FP8", "Qwen3.6-27B"]
  },
  {
    id: "bothub",
    name: "Bothub",
    apiKeyEnvVars: ["BOTHUB_API_KEY"],
    models: ["gemma-4-31b-it:free", "nemotron-3-ultra-550b-a55b:free"]
  },
  {
    id: "cerebras",
    name: "Cerebras",
    apiKeyEnvVars: ["CEREBRAS_API_KEY"],
    models: ["gpt-oss-120b", "qwen-3.8-27b"]
  },
  {
    id: "hyper",
    name: "Charm Hyper",
    apiKeyEnvVars: ["HYPER_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "gemma-4-26b-a4b-it",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-oss-120b",
      "inkling",
      "kimi-k2-thinking",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "llama-3.3-70b-instruct",
      "llama-4-maverick-17b-128e-instruct-fp8",
      "minimax-m2.7",
      "minimax-m3",
      "qwen3-coder-480b-a35b-instruct-int4-mixed-ar",
      "qwen3-next-80b-a3b-instruct",
      "qwen3.6-flash",
      "qwen3.6-max",
      "qwen3.6-plus",
      "qwen3.7-flash",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-2.4t-a95b",
      "qwen3.8-27b",
      "qwen3.8-flash",
      "qwen3.8-max"
    ]
  },
  {
    id: "chutes",
    name: "Chutes",
    apiKeyEnvVars: ["CHUTES_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V3.2-TEE",
      "deepseek-ai/DeepSeek-V4-Flash-0731-TEE",
      "google/gemma-4-31B-turbo-TEE",
      "moonshotai/Kimi-K2.6-TEE",
      "moonshotai/Kimi-K3-TEE",
      "Nemotron-3-Nano-Omni-30B-TEE",
      "Qwen/Qwen3-235B-A22B-Thinking-2507-TEE",
      "Qwen/Qwen3-32B-TEE",
      "Qwen/Qwen3.5-397B-A17B-TEE",
      "Qwen/Qwen3.6-27B-TEE",
      "Qwen/Qwen3.8-27B-TEE",
      "unsloth/Mistral-Nemo-Instruct-2407-TEE",
      "zai-org/GLM-5.1-TEE",
      "zai-org/GLM-5.2-TEE"
    ]
  },
  {
    id: "clarifai",
    name: "Clarifai",
    apiKeyEnvVars: ["CLARIFAI_PAT"],
    models: [
      "arcee_ai/AFM/models/trinity-mini",
      "clarifai/main/models/mm-poly-8b",
      "deepseek-ai/deepseek-ocr/models/DeepSeek-OCR",
      "minimaxai/chat-completion/models/MiniMax-M2_5-high-throughput",
      "mistralai/completion/models/Ministral-3-14B-Reasoning-2512",
      "mistralai/completion/models/Ministral-3-3B-Reasoning-2512",
      "moonshotai/chat-completion/models/Kimi-K2_6",
      "openai/chat-completion/models/gpt-oss-120b-high-throughput",
      "openai/chat-completion/models/gpt-oss-20b",
      "qwen/qwenCoder/models/Qwen3-Coder-30B-A3B-Instruct",
      "qwen/qwenLM/models/Qwen3-30B-A3B-Instruct-2507",
      "qwen/qwenLM/models/Qwen3-30B-A3B-Thinking-2507"
    ]
  },
  {
    id: "claudinio",
    name: "Claudinio",
    apiKeyEnvVars: ["CLAUDINIO_API_KEY"],
    models: ["claudinio", "claudius"]
  },
  {
    id: "cline-pass",
    name: "ClinePass",
    apiKeyEnvVars: ["CLINE_API_KEY"],
    models: [
      "cline-pass/deepseek-v4-flash",
      "cline-pass/deepseek-v4-pro",
      "cline-pass/glm-5.2",
      "cline-pass/glm-5.3",
      "cline-pass/glm-5.3-flash",
      "cline-pass/kimi-k2.6",
      "cline-pass/kimi-k2.7-code",
      "cline-pass/kimi-k3",
      "cline-pass/mimo-v2.5",
      "cline-pass/mimo-v2.5-pro",
      "cline-pass/minimax-m3",
      "cline-pass/qwen3.7-max",
      "cline-pass/qwen3.7-plus",
      "cline-pass/qwen3.8-max"
    ]
  },
  {
    id: "cloudferro-sherlock",
    name: "CloudFerro Sherlock",
    apiKeyEnvVars: ["CLOUDFERRO_SHERLOCK_API_KEY"],
    models: [
      "meta-llama/Llama-3.3-70B-Instruct",
      "MiniMaxAI/MiniMax-M2.5",
      "openai/gpt-oss-120b",
      "speakleash/Bielik-11B-v2.6-Instruct",
      "speakleash/Bielik-11B-v3.0-Instruct"
    ]
  },
  {
    id: "cloudflare-workers-ai",
    name: "Cloudflare Workers AI",
    apiKeyEnvVars: ["CLOUDFLARE_API_KEY"],
    models: [
      "@cf/aisingapore/gemma-sea-lion-v4-27b-it",
      "@cf/deepseek-ai/deepseek-r1-distill-qwen-32b",
      "@cf/deepseek-ai/deepseek-v4-flash-0731",
      "@cf/deepseek-ai/deepseek-v4-pro-0813",
      "@cf/google/gemma-4-26b-a4b-it",
      "@cf/ibm-granite/granite-4.0-h-micro",
      "@cf/meta/llama-3.1-8b-instruct-fp8",
      "@cf/meta/llama-3.2-11b-vision-instruct",
      "@cf/meta/llama-3.2-1b-instruct",
      "@cf/meta/llama-3.2-3b-instruct",
      "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
      "@cf/meta/llama-4-scout-17b-16e-instruct",
      "@cf/meta/llama-guard-3-8b",
      "@cf/mistralai/mistral-small-3.1-24b-instruct",
      "@cf/moonshotai/kimi-k2.6",
      "@cf/moonshotai/kimi-k2.7-code",
      "@cf/nvidia/nemotron-3-120b-a12b",
      "@cf/openai/gpt-oss-120b",
      "@cf/openai/gpt-oss-20b",
      "@cf/qwen/qwen2.5-coder-32b-instruct",
      "@cf/qwen/qwen3-30b-a3b-fp8",
      "@cf/qwen/qwen3.8-27b",
      "@cf/qwen/qwq-32b",
      "@cf/zai-org/glm-4.7-flash",
      "@cf/zai-org/glm-5.2",
      "@cf/zai-org/glm-5.3",
      "@cf/zai-org/glm-5.3-flash"
    ]
  },
  {
    id: "coralbricks",
    name: "CoralBricks",
    apiKeyEnvVars: ["CORAL_API_KEY"],
    models: ["glm-5.3-fp4", "gpt-oss-120b", "kimi-k3"]
  },
  {
    id: "cortecs",
    name: "Cortecs",
    apiKeyEnvVars: ["CORTECS_API_KEY"],
    models: [
      "apertus-70b",
      "claude-4-5-sonnet",
      "claude-4-6-sonnet",
      "claude-haiku-4-5",
      "claude-opus-5",
      "claude-opus4-5",
      "claude-opus4-6",
      "claude-opus4-7",
      "claude-opus4-8",
      "claude-sonnet-4",
      "claude-sonnet-5",
      "codestral-2508",
      "deepseek-r1-0528",
      "deepseek-v3.2",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "devstral-2512",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-3.1-flash-lite",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemma-3-27b-it",
      "gemma-4-26b-a4b-it",
      "gemma-4-31b-it",
      "glm-4.7-flash",
      "glm-5",
      "glm-5-turbo",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5v-turbo",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.4",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "gpt-oss-safeguard-120b",
      "hermes-4-405b",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "llama-3.1-405b-instruct",
      "llama-3.1-8b-instruct",
      "llama-3.3-70b-instruct",
      "minicpm-v-4.5",
      "minimax-m2",
      "minimax-m2.1",
      "minimax-m2.5",
      "minimax-m2.7",
      "minimax-m3",
      "ministral-14b-2512",
      "ministral-3b-2512",
      "ministral-8b-2512",
      "mistral-7b-instruct-v0.2",
      "mistral-7b-instruct-v0.3",
      "mistral-large-2402",
      "mistral-large-2512",
      "mistral-medium-3.5",
      "mistral-nemo-instruct-2407",
      "mistral-small-2503",
      "mistral-small-2603",
      "mistral-small-3.2-24b-instruct-2506",
      "mixtral-8x7B-instruct-v0.1",
      "nemotron-nano-v2-12b",
      "nova-2-lite",
      "nova-lite-v1",
      "nova-micro-v1",
      "nova-pro-v1",
      "nvidia-nemotron-3-nano-30b-a3b",
      "pixtral-12b-2409",
      "pixtral-large-2502",
      "qwen2.5-vl-72b-instruct",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-30b-a3b-instruct-2507",
      "qwen3-32b",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-coder-next",
      "qwen3-vl-235b-a22b",
      "qwen3.5-122b-a10b",
      "qwen3.5-397b-a17b",
      "qwen3.5-9b",
      "qwen3.6-27b",
      "qwen3.6-35b-a3b",
      "qwen3.8-2.4t-a95b",
      "qwen3.8-27b",
      "qwen3.8-flash-next",
      "qwen3guard-gen-0.6b",
      "qwen3guard-gen-8b",
      "voxtral-small-2507"
    ]
  },
  {
    id: "crof",
    name: "CrofAI",
    apiKeyEnvVars: ["CROF_API_KEY"],
    models: [
      "deepseek-v3.2",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "gemma-4-31b-it",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "greg-1-mini",
      "greg-2-super",
      "greg-2-ultra",
      "greg-rp",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "kimi-k3-eco",
      "mimo-v2.5-pro",
      "qwen3.5-397b-a17b",
      "qwen3.5-9b",
      "qwen3.6-27b",
      "qwen3.8-27b"
    ]
  },
  {
    id: "crossmodel",
    name: "CrossModel",
    apiKeyEnvVars: ["CROSSMODEL_API_KEY"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "gemini/gemini-2.5-flash",
      "gemini/gemini-2.5-flash-lite",
      "gemini/gemini-2.5-pro",
      "gemini/gemini-3-flash-preview",
      "gemini/gemini-3.1-pro-preview",
      "gemini/gemini-3.5-flash",
      "gemini/gemini-3.5-flash-lite",
      "gemini/gemini-3.6-flash",
      "gemini/gemini-3.7-flash",
      "gemini/gemini-3.8-flash",
      "minimax/minimax-m2.7",
      "minimax/minimax-m3",
      "moonshot/kimi-k2.5",
      "moonshot/kimi-k2.6",
      "moonshot/kimi-k2.7-code",
      "moonshot/kimi-k3",
      "openai/gpt-4o-mini",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-flash",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-flash",
      "qwen/qwen3.8-max",
      "tencent/hy3",
      "tencent/hy4-preview",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-4.6",
      "x-ai/grok-build-0.1",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "z-ai/glm-4.7",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash"
    ]
  },
  {
    id: "crusoe",
    name: "Crusoe",
    apiKeyEnvVars: ["CRUSOE_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V3-0324",
      "google/gemma-4-31b-it",
      "meta-llama/Llama-3.3-70B-Instruct",
      "moonshotai/Kimi-K2.6",
      "nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B",
      "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B",
      "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B",
      "openai/gpt-oss-120b",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "zai/GLM-5.1",
      "zai/GLM-5.2"
    ]
  },
  {
    id: "drun",
    name: "D.Run (China)",
    apiKeyEnvVars: ["DRUN_API_KEY"],
    models: ["public/deepseek-r1", "public/deepseek-v3", "public/minimax-m25"]
  },
  {
    id: "daoxe",
    name: "DaoXE",
    apiKeyEnvVars: ["DAOXE_API_KEY"],
    models: [
      "claude-haiku-4-5-20251001",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "gemini-3.1-pro-preview",
      "gpt-5.4",
      "gpt-5.5",
      "grok-4.3",
      "grok-4.5",
      "kimi-k2.5"
    ]
  },
  {
    id: "databricks",
    name: "Databricks",
    apiKeyEnvVars: ["DATABRICKS_TOKEN"],
    models: [
      "databricks-claude-haiku-4-5",
      "databricks-claude-opus-4-1",
      "databricks-claude-opus-4-5",
      "databricks-claude-opus-4-6",
      "databricks-claude-opus-4-7",
      "databricks-claude-sonnet-4",
      "databricks-claude-sonnet-4-5",
      "databricks-claude-sonnet-4-6",
      "databricks-gemini-2-5-flash",
      "databricks-gemini-2-5-pro",
      "databricks-gemini-3-1-flash-lite",
      "databricks-gemini-3-1-pro",
      "databricks-gemini-3-flash",
      "databricks-gemini-3-pro",
      "databricks-glm-5-2",
      "databricks-gpt-5",
      "databricks-gpt-5-1",
      "databricks-gpt-5-2",
      "databricks-gpt-5-4",
      "databricks-gpt-5-4-mini",
      "databricks-gpt-5-4-nano",
      "databricks-gpt-5-5",
      "databricks-gpt-5-6-luna",
      "databricks-gpt-5-6-sol",
      "databricks-gpt-5-6-terra",
      "databricks-gpt-5-mini",
      "databricks-gpt-5-nano",
      "databricks-gpt-oss-120b",
      "databricks-gpt-oss-20b",
      "databricks-kimi-k2-7-code"
    ]
  },
  {
    id: "deepinfra",
    name: "Deep Infra",
    apiKeyEnvVars: ["DEEPINFRA_API_KEY"],
    models: [
      "ByteDance/Seed-2.0-code",
      "ByteDance/Seed-2.0-mini",
      "ByteDance/Seed-2.0-pro",
      "deepseek-ai/DeepSeek-R1-0528",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3-0324",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "google/gemma-4-26B-A4B-it",
      "google/gemma-4-31B-it",
      "google/gemma-4-E4B-it",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      "meta-llama/Llama-4-Scout-17B-16E-Instruct",
      "MiniMaxAI/MiniMax-M2.5",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.5",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "nvidia/Llama-3.3-Nemotron-Super-49B-v1.5",
      "nvidia/Nemotron-3-Nano-30B-A3B",
      "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-30B-A3B",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo",
      "Qwen/Qwen3-Max",
      "Qwen/Qwen3-Next-80B-A3B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "Qwen/Qwen3.5-122B-A10B",
      "Qwen/Qwen3.5-27B",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.6-35B-A3B",
      "Qwen/Qwen3.7-Max",
      "Qwen/Qwen3.8-2.4T-A95B",
      "Qwen/Qwen3.8-27B",
      "Qwen/Qwen3.8-Max",
      "stepfun-ai/Step-3.7-Flash",
      "tencent/Hy3",
      "thinkingmachines/Inkling",
      "thinkingmachines/Inkling-Small",
      "XiaomiMiMo/MiMo-V2.5",
      "XiaomiMiMo/MiMo-V2.5-Pro",
      "zai-org/GLM-4.6",
      "zai-org/GLM-4.7",
      "zai-org/GLM-4.7-Flash",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    apiKeyEnvVars: ["DEEPSEEK_API_KEY"],
    models: ["deepseek-v4-flash", "deepseek-v4-flash-vision-exp", "deepseek-v4-pro"]
  },
  {
    id: "llmgateway",
    name: "DevPass (LLM Gateway)",
    apiKeyEnvVars: ["LLMGATEWAY_API_KEY"],
    models: [
      "auto",
      "claude-fable-5",
      "claude-fable-5-1",
      "claude-haiku-4-5",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-1-20250805",
      "claude-opus-4-5-20251101",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-5",
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "codestral-2508",
      "custom",
      "deepseek-v3.2",
      "deepseek-v4-flash",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "devstral-2512",
      "ernie-4.5-vl-424b-a47b",
      "fugu-ultra",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-pro-latest",
      "gemma-4-26b-a4b-it",
      "gemma-4-31b-it",
      "glm-4-32b-0414-128k",
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-airx",
      "glm-4.5-x",
      "glm-4.5v",
      "glm-4.6",
      "glm-4.6v",
      "glm-4.6v-flashx",
      "glm-4.7",
      "glm-4.7-flash",
      "glm-4.7-flashx",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "glm-5.2-fast",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-3.5-turbo",
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-4o-mini-transcribe",
      "gpt-4o-transcribe",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-pro",
      "gpt-5.1",
      "gpt-5.1-codex",
      "gpt-5.1-codex-mini",
      "gpt-5.2",
      "gpt-5.2-codex",
      "gpt-5.2-pro",
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
      "gpt-5.5",
      "gpt-5.5-pro",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-6-astra",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "grok-4",
      "grok-4-1-fast-non-reasoning",
      "grok-4-1-fast-reasoning",
      "grok-4-20-beta-0309-non-reasoning",
      "grok-4-20-beta-0309-reasoning",
      "grok-4-20-non-reasoning",
      "grok-4-20-reasoning",
      "grok-4-3",
      "grok-4-5",
      "grok-4-6",
      "grok-build-0-1",
      "hy3",
      "kimi-k2",
      "kimi-k2-thinking",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k2.7-code-highspeed",
      "kimi-k3",
      "kimi-k3-fast",
      "ling-3.0-flash",
      "llama-3-70b-instruct",
      "llama-3.1-70b-instruct",
      "llama-3.2-11b-instruct",
      "llama-3.2-3b-instruct",
      "llama-3.3-70b-instruct",
      "llama-4-maverick-17b-instruct",
      "llama-4-scout-17b-instruct",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "minimax-m2",
      "minimax-m2.1",
      "minimax-m2.1-lightning",
      "minimax-m2.5",
      "minimax-m2.5-highspeed",
      "minimax-m2.7",
      "minimax-m2.7-highspeed",
      "minimax-m3",
      "minimax-text-01",
      "ministral-14b-2512",
      "ministral-3b-2512",
      "ministral-8b-2512",
      "mistral-large-2512",
      "mistral-large-latest",
      "mistral-small-2506",
      "muse-spark-1.1",
      "muse-spark-1.2",
      "muse-spark-1.2-contributor",
      "muse-spark-1.3",
      "muse-spark-1.3-contributor",
      "nemotron-3-ultra-550b",
      "o1",
      "o3",
      "o3-mini",
      "o4-mini",
      "qwen-coder-plus",
      "qwen-flash",
      "qwen-max",
      "qwen-omni-turbo",
      "qwen-plus",
      "qwen-plus-latest",
      "qwen3-235b-a22b-fp8",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-235b-a22b-thinking-2507",
      "qwen3-32b",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-coder-480b-a35b-instruct",
      "qwen3-coder-flash",
      "qwen3-coder-next",
      "qwen3-coder-plus",
      "qwen3-max",
      "qwen3-next-80b-a3b-instruct",
      "qwen3-next-80b-a3b-thinking",
      "qwen3-vl-235b-a22b-instruct",
      "qwen3-vl-235b-a22b-thinking",
      "qwen3-vl-30b-a3b-instruct",
      "qwen3-vl-flash",
      "qwen3-vl-plus",
      "qwen3.5-9b",
      "qwen3.6-35b-a3b",
      "qwen3.6-flash",
      "qwen3.6-max-preview",
      "qwen3.6-plus",
      "qwen3.7-flash",
      "qwen3.7-max",
      "qwen3.7-plus",
      "Qwen3.8-27B",
      "qwen3.8-flash",
      "qwen3.8-max",
      "qwen35-397b-a17b",
      "seed-1-6-250615",
      "seed-1-6-250915",
      "seed-1-6-flash-250715",
      "seed-1-8-251228",
      "sonar",
      "sonar-pro",
      "sonar-reasoning-pro"
    ]
  },
  {
    id: "digitalocean",
    name: "DigitalOcean",
    apiKeyEnvVars: ["DIGITALOCEAN_ACCESS_TOKEN"],
    models: [
      "alibaba-qwen3-32b",
      "all-mini-lm-l6-v2",
      "anthropic-claude-3-opus",
      "anthropic-claude-3.5-haiku",
      "anthropic-claude-3.5-sonnet",
      "anthropic-claude-3.7-sonnet",
      "anthropic-claude-4.1-opus",
      "anthropic-claude-4.5-haiku",
      "anthropic-claude-4.5-sonnet",
      "anthropic-claude-4.6-sonnet",
      "anthropic-claude-5-sonnet",
      "anthropic-claude-fable-5",
      "anthropic-claude-fable-5.1",
      "anthropic-claude-haiku-4.5",
      "anthropic-claude-opus-4",
      "anthropic-claude-opus-4.5",
      "anthropic-claude-opus-4.6",
      "anthropic-claude-opus-4.7",
      "anthropic-claude-opus-4.8",
      "anthropic-claude-opus-5",
      "anthropic-claude-sonnet-4",
      "arcee-trinity-large-thinking",
      "bge-m3",
      "bge-reranker-v2-m3",
      "deepseek-3.2",
      "deepseek-4-flash",
      "deepseek-r1-distill-llama-70b",
      "deepseek-v3",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "e5-large-v2",
      "fal-ai/elevenlabs/tts/multilingual-v2",
      "fal-ai/fast-sdxl",
      "fal-ai/flux/schnell",
      "fal-ai/stable-audio-25/text-to-audio",
      "gemma-4-31B-it",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gte-large-en-v1.5",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k3",
      "llama-4-maverick",
      "llama3-8b-instruct",
      "llama3.3-70b-instruct",
      "mimo-v2.5-pro",
      "minimax-m2.5",
      "ministral-3-8b-instruct-2512",
      "mistral-3-14B",
      "mistral-7b-instruct-v0.3",
      "mistral-nemo-instruct-2407",
      "multi-qa-mpnet-base-dot-v1",
      "nemotron-3-nano-30b",
      "nemotron-3-nano-omni",
      "nemotron-3-ultra-550b",
      "nemotron-nano-12b-v2-vl",
      "nvidia-nemotron-3-super-120b",
      "openai-gpt-4.1",
      "openai-gpt-4o",
      "openai-gpt-4o-mini",
      "openai-gpt-5",
      "openai-gpt-5-mini",
      "openai-gpt-5-nano",
      "openai-gpt-5.1-codex-max",
      "openai-gpt-5.2",
      "openai-gpt-5.2-pro",
      "openai-gpt-5.3-codex",
      "openai-gpt-5.4",
      "openai-gpt-5.4-mini",
      "openai-gpt-5.4-nano",
      "openai-gpt-5.4-pro",
      "openai-gpt-5.5",
      "openai-gpt-5.6-luna",
      "openai-gpt-5.6-sol",
      "openai-gpt-5.6-terra",
      "openai-gpt-image-1",
      "openai-gpt-image-1.5",
      "openai-gpt-image-2",
      "openai-gpt-oss-120b",
      "openai-gpt-oss-20b",
      "openai-o1",
      "openai-o3",
      "openai-o3-mini",
      "qwen-2.5-14b-instruct",
      "qwen3-coder-flash",
      "qwen3-embedding-0.6b",
      "qwen3-tts-voicedesign",
      "qwen3.5-397b-a17b",
      "qwen3.8-max",
      "stable-diffusion-3.5-large",
      "wan2-2-t2v-a14b"
    ]
  },
  {
    id: "dinference",
    name: "DInference",
    apiKeyEnvVars: ["DINFERENCE_API_KEY"],
    models: ["glm-4.7", "glm-5", "glm-5.1", "glm-5.2", "gpt-oss-120b", "minimax-m2.5"]
  },
  {
    id: "ebcloud",
    name: "EBCloud",
    apiKeyEnvVars: ["EBCLOUD_API_KEY"],
    models: ["DeepSeek-V4-Flash", "DeepSeek-V4-Pro", "GLM-5.1", "Kimi-K2.6"]
  },
  {
    id: "echo",
    name: "Echo",
    apiKeyEnvVars: ["ECHO_API_KEY"],
    models: ["echo"]
  },
  {
    id: "edenai",
    name: "Eden AI",
    apiKeyEnvVars: ["EDENAI_API_KEY"],
    models: [
      "amazon/moonshot.kimi-k2-thinking",
      "amazon/moonshotai.kimi-k2.5",
      "amazon/zai.glm-4.7-flash",
      "amazon/zai.glm-4.7-flash@us",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-fable-latest",
      "anthropic/claude-opus-4-5",
      "anthropic/claude-opus-4-5-20251101",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-opus-latest",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "anthropic/claude-sonnet-latest",
      "azure/gpt-5.1-codex",
      "azure/gpt-5.1-codex-max",
      "azure/gpt-5.1-codex-mini",
      "azure/gpt-5.2-codex",
      "cerebras/gpt-oss-120b",
      "cloudflare/@cf/aisingapore/gemma-sea-lion-v4-27b-it",
      "cloudflare/@cf/deepseek-ai/deepseek-v4-flash-0731",
      "cloudflare/@cf/deepseek-ai/deepseek-v4-pro-0813",
      "cloudflare/@cf/meta/llama-guard-3-8b",
      "cloudflare/@cf/openai/gpt-oss-120b",
      "cloudflare/@cf/openai/gpt-oss-20b",
      "cloudflare/@cf/qwen/qwen2.5-coder-32b-instruct",
      "cloudflare/@cf/zai-org/glm-4.7-flash",
      "cohere/command-a-03-2025",
      "cohere/command-r-08-2024",
      "cohere/command-r-plus-08-2024",
      "cohere/command-r7b-12-2024",
      "databricks/databricks-deepseek-v4-flash-0731",
      "databricks/databricks-deepseek-v4-pro-0813",
      "databricks/databricks-gpt-oss-120b",
      "databricks/databricks-gpt-oss-120b@eu",
      "databricks/databricks-gpt-oss-20b",
      "databricks/databricks-gpt-oss-20b@eu",
      "databricks/databricks-inkling",
      "deepinfra/ByteDance/Seed-2.0-code",
      "deepinfra/ByteDance/Seed-2.0-mini",
      "deepinfra/deepseek-ai/DeepSeek-R1",
      "deepinfra/deepseek-ai/DeepSeek-V3",
      "deepinfra/deepseek-ai/DeepSeek-V3-0324",
      "deepinfra/deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepinfra/deepseek-ai/DeepSeek-V4-Pro-0813",
      "deepinfra/meta-llama/Llama-3.2-11B-Vision-Instruct",
      "deepinfra/meta-llama/Llama-3.3-70B-Instruct",
      "deepinfra/meta-llama/Llama-Guard-3-8B",
      "deepinfra/meta-models/Muse-Glimmer-30B",
      "deepinfra/moonshotai/Kimi-K2.5",
      "deepinfra/nemotron-3-ultra-550b-a55b",
      "deepinfra/nvidia/Llama-3.1-Nemotron-70B-Instruct",
      "deepinfra/nvidia/Nemotron-3-Nano-30B-A3B",
      "deepinfra/openai/gpt-oss-120b",
      "deepinfra/openai/gpt-oss-20b",
      "deepinfra/stepfun-ai/Step-3.5-Flash",
      "deepinfra/stepfun-ai/Step-3.7-Flash",
      "deepinfra/tencent/Hy3",
      "deepinfra/thinkingmachines/Inkling",
      "deepinfra/thinkingmachines/Inkling-Small",
      "deepinfra/zai-org/GLM-4.7-Flash",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "fireworks_ai/accounts/fireworks/models/deepseek-v4-flash-0731",
      "fireworks_ai/accounts/fireworks/models/deepseek-v4-pro-0813",
      "fireworks_ai/accounts/fireworks/models/inkling",
      "fireworks_ai/accounts/fireworks/models/muse-glimmer-30b",
      "fireworks_ai/gpt-oss-120b",
      "flexai/deepseek-v4-flash-0731",
      "flexai/gpt-oss-120b",
      "flexai/gpt-oss-20b",
      "flexai/Muse-Glimmer-30B",
      "flexai/Nemotron-3-Super-120B-A12B",
      "flexai/Step-3.7-Flash",
      "google/gemini-2.5-flash-image",
      "google/gemini-3-flash-preview",
      "google/gemini-3-pro-image",
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-image",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemini-flash-latest",
      "google/gemini-pro-latest",
      "groq/openai/gpt-oss-120b",
      "groq/openai/gpt-oss-20b",
      "ionos/meta-llama/Llama-3.3-70B-Instruct",
      "ionos/openai/gpt-oss-120b",
      "minimax/MiniMax-M2",
      "minimax/MiniMax-M2.1",
      "minimax/MiniMax-M2.5",
      "minimax/MiniMax-M2.7",
      "minimax/MiniMax-M3",
      "mistral/codestral-latest",
      "mistral/devstral-2512",
      "mistral/devstral-medium-latest",
      "mistral/magistral-medium-latest",
      "mistral/mistral-large-2512",
      "mistral/mistral-large-latest",
      "mistral/mistral-medium-2505",
      "mistral/mistral-medium-2604",
      "mistral/mistral-medium-latest",
      "mistral/mistral-small-2603",
      "mistral/mistral-small-latest",
      "mistral/voxtral-small-latest",
      "moonshot/kimi-k2.6",
      "moonshot/kimi-k2.7-code",
      "moonshot/kimi-k2.7-code-highspeed",
      "moonshot/kimi-k3",
      "nebius/deepseek-ai/DeepSeek-V4-Flash-0731",
      "nebius/meta-llama/Llama-3.3-70B-Instruct",
      "nebius/nvidia/nemotron-3-super-120b-a12b",
      "nebius/nvidia/Nemotron-3-Ultra-550b-a55b",
      "nebius/openai/gpt-oss-120b",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.2",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "openai/gpt-latest",
      "openai/gpt-mini-latest",
      "openai/gpt-pro-latest",
      "openai/o1",
      "openai/o1-pro",
      "openai/o3",
      "openai/o3-mini",
      "openai/o3-pro",
      "openai/o4-mini",
      "ovhcloud/gpt-oss-120b",
      "ovhcloud/gpt-oss-20b",
      "perplexityai/sonar",
      "perplexityai/sonar-deep-research",
      "perplexityai/sonar-pro",
      "perplexityai/sonar-reasoning-pro",
      "qwen/deepseek-v4-flash-0731",
      "qwen/deepseek-v4-pro-0813",
      "qwen/qwen-max",
      "qwen/qwen-vl-max",
      "qwen/qwen-vl-plus",
      "qwen/qwen3-235b-a22b-instruct-2507",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-coder-480b-a35b-instruct",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-coder-next@eu",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3-max@eu",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3.8-2.4t-a95b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.8-flash",
      "qwen/qwen3.8-max",
      "qwen/qwen3.8-max-0902",
      "qwen/qwq-plus",
      "scaleway/deepseek-v4-flash-0731",
      "scaleway/gpt-oss-120b",
      "scaleway/llama-3.3-70b-instruct",
      "tensorx/deepseek/deepseek-v4-flash-0731",
      "tensorx/deepseek/deepseek-v4-pro-0813",
      "tensorx/moonshotai/kimi-k2.5",
      "together_ai/deepseek-ai/DeepSeek-V4-Flash-0731",
      "together_ai/deepseek-ai/DeepSeek-V4-Pro-0813",
      "together_ai/meta-models/Muse-Glimmer-30B",
      "together_ai/openai/gpt-oss-120b",
      "together_ai/openai/gpt-oss-20b",
      "together_ai/thinkingmachines/Inkling",
      "together_ai/thinkingmachines/Inkling-Small",
      "vertex/gemini-2.5-flash-image",
      "vertex/gemini-3-flash-preview",
      "vertex/gemini-3-pro-image",
      "vertex/gemini-3.1-flash-image",
      "vertex/gemini-3.1-flash-lite",
      "vertex/gemini-3.1-flash-lite-image",
      "vertex/gemini-3.1-flash-lite@eu",
      "vertex/gemini-3.1-flash-lite@us",
      "vertex/gemini-3.1-pro-preview",
      "vertex/gemini-3.5-flash",
      "vertex/gemini-3.5-flash-lite",
      "vertex/gemini-3.5-flash-lite@eu",
      "vertex/gemini-3.5-flash-lite@us",
      "vertex/gemini-3.5-flash@eu",
      "vertex/gemini-3.5-flash@us",
      "vertex/gemini-3.6-flash",
      "vertex/gemini-3.6-flash@eu",
      "vertex/gemini-3.6-flash@us",
      "vertex/gemini-3.7-flash",
      "vertex/gemini-3.7-flash@eu",
      "vertex/gemini-3.7-flash@us",
      "vertex/gemini-3.8-flash",
      "vertex/gemini-3.8-flash@eu",
      "vertex/gemini-3.8-flash@us",
      "vertex/gemini-flash-latest",
      "vertex/gemini-pro-latest",
      "xai/grok-4.20-0309-non-reasoning",
      "xai/grok-4.20-0309-reasoning",
      "xai/grok-4.3",
      "xai/grok-4.5",
      "xai/grok-4.6",
      "xai/grok-build-0.1",
      "xai/grok-latest",
      "zai/glm-4.6",
      "zai/glm-4.6v",
      "zai/glm-4.7",
      "zai/glm-5",
      "zai/glm-5-turbo",
      "zai/glm-5.1",
      "zai/glm-5.2",
      "zai/glm-5.3",
      "zai/glm-5.3-flash",
      "zai/glm-5v-turbo"
    ]
  },
  {
    id: "empiriolabs",
    name: "EmpirioLabs AI",
    apiKeyEnvVars: ["EMPIRIOLABS_API_KEY"],
    models: [
      "deepseek-v3-2",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "fugu-ultra-v1-0",
      "fugu-ultra-v1-1",
      "gemma-4-26b-a4b",
      "glm-4-5-flash",
      "glm-4-6v-flash",
      "glm-4-7-flash",
      "glm-5-1",
      "glm-5-2",
      "glm-5-3",
      "glm-5-3-flash",
      "kimi-k2-6",
      "kimi-k2-7-code",
      "kimi-k2-7-code-highspeed",
      "kimi-k3",
      "mimo-v2-5",
      "mimo-v2-5-pro",
      "minimax-m2-7",
      "minimax-m2-7-highspeed",
      "minimax-m3",
      "mistral-small-4",
      "muse-glimmer-30b",
      "muse-spark-1-1",
      "muse-spark-1-2",
      "muse-spark-1-3",
      "qwen3-5-122b-a10b",
      "qwen3-5-27b",
      "qwen3-5-35b-a3b",
      "qwen3-5-397b-a17b",
      "qwen3-5-4b",
      "qwen3-5-9b",
      "qwen3-5-flash",
      "qwen3-5-plus",
      "qwen3-6-27b",
      "qwen3-6-35b-a3b",
      "qwen3-6-flash",
      "qwen3-6-max-preview",
      "qwen3-6-plus",
      "qwen3-7-flash",
      "qwen3-7-max",
      "qwen3-7-plus",
      "qwen3-8-27b",
      "qwen3-8-flash",
      "qwen3-8-max",
      "qwen3-8-max-0902",
      "qwen3-max",
      "seed-2-0-code",
      "seed-2-0-lite",
      "seed-2-0-mini",
      "seed-2-0-pro",
      "seed-2-1-turbo",
      "step-3-5-flash",
      "step-3-5-flash-2603",
      "step-3-7-flash"
    ]
  },
  {
    id: "evroc",
    name: "evroc",
    apiKeyEnvVars: ["EVROC_API_KEY"],
    models: [
      "evroc/roc",
      "google/gemma-4-26B-A4B-it",
      "intfloat/multilingual-e5-large-instruct",
      "KBLab/kb-whisper-large",
      "mistralai/Mistral-Medium-3.5-128B",
      "mistralai/Voxtral-Small-24B-2507",
      "moonshotai/Kimi-K2.6",
      "nvidia/Llama-3.3-70B-Instruct-FP8",
      "openai/gpt-oss-120b",
      "openai/whisper-large-v3",
      "openai/whisper-large-v3-turbo",
      "Qwen/Qwen3-Embedding-8B",
      "Qwen/Qwen3-Reranker-4B",
      "Qwen/Qwen3.6-35B-A3B",
      "Qwen/Qwen3.8-27B",
      "zai-org/GLM-5.2"
    ]
  },
  {
    id: "fastrouter",
    name: "FastRouter",
    apiKeyEnvVars: ["FASTROUTER_API_KEY"],
    models: [
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.6",
      "bytedance/seedance-2",
      "deepseek-ai/deepseek-r1-distill-llama-70b",
      "deepseek/deepseek-v4-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.5-flash",
      "google/gemma-4-31b-it",
      "google/imagen-4.0-fast",
      "google/imagen-4.0-ultra",
      "google/veo3.1",
      "google/veo3.1-fast",
      "google/veo3.1-lite",
      "leonardo-ai/lucid-origin",
      "leonardo-ai/lucid-realism",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "moonshotai/kimi-k2",
      "moonshotai/kimi-k2.6",
      "openai/gpt-4.1",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-image-2",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-realtime-1.5",
      "qwen/qwen3-coder",
      "sarvam/sarvam-105b",
      "sarvam/sarvam-30b",
      "wanx/wan-v2-6",
      "x-ai/grok-4",
      "x-ai/grok-4.3",
      "x-ai/grok-build-0.1",
      "z-ai/glm-5",
      "z-ai/glm-5.1"
    ]
  },
  {
    id: "fireworks-ai",
    name: "Fireworks AI",
    apiKeyEnvVars: ["FIREWORKS_API_KEY"],
    models: [
      "accounts/fireworks/models/deepseek-v4-flash-0731",
      "accounts/fireworks/models/deepseek-v4-flash-vision-exp",
      "accounts/fireworks/models/deepseek-v4-pro-0813",
      "accounts/fireworks/models/glm-5p2",
      "accounts/fireworks/models/glm-5p3",
      "accounts/fireworks/models/glm-5p3-flash",
      "accounts/fireworks/models/gpt-oss-120b",
      "accounts/fireworks/models/inkling",
      "accounts/fireworks/models/kimi-k2p6",
      "accounts/fireworks/models/kimi-k2p7-code",
      "accounts/fireworks/models/kimi-k3",
      "accounts/fireworks/models/minimax-m3",
      "accounts/fireworks/models/muse-glimmer-30b",
      "accounts/fireworks/models/nemotron-3-ultra-nvfp4",
      "accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b",
      "accounts/fireworks/models/qwen3p7-plus",
      "accounts/fireworks/models/qwen3p8-2p4t-a95b",
      "accounts/fireworks/models/qwen3p8-max",
      "accounts/fireworks/routers/glm-5p2-fast",
      "accounts/fireworks/routers/kimi-k3-fast"
    ]
  },
  {
    id: "freemodel",
    name: "FreeModel",
    apiKeyEnvVars: ["FREEMODEL_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.5"
    ]
  },
  {
    id: "friendli",
    name: "Friendli",
    apiKeyEnvVars: ["FRIENDLI_TOKEN"],
    models: [
      "deepseek-ai/DeepSeek-V3.2",
      "google/gemma-4-31B-it",
      "MiniMaxAI/MiniMax-M2.5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3"
    ]
  },
  {
    id: "frogbot",
    name: "FrogBot",
    apiKeyEnvVars: ["FROGBOT_API_KEY"],
    models: [
      "claude-haiku-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-sonnet-4-6",
      "deepseek-v4-pro",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "gemini-3-1-pro-preview",
      "gemini-3-flash-preview",
      "gpt-4o",
      "gpt-5-3-codex",
      "gpt-5-4-mini",
      "gpt-5-4-nano",
      "gpt-5-5",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "grok-4-1-fast-non-reasoning",
      "grok-4-1-fast-reasoning",
      "grok-4-3",
      "grok-code-fast-1",
      "kimi-k2-6",
      "kimi-k2.5",
      "minimax-m2-5",
      "minimax-m2-7",
      "qwen-3-6-plus",
      "zai-glm-5-1"
    ]
  },
  {
    id: "gmicloud",
    name: "GMI Cloud",
    apiKeyEnvVars: ["GMICLOUD_API_KEY"],
    models: [
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-sonnet-4.6",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.6",
      "moonshotai/kimi-k2.7-code-highspeed",
      "openai/gpt-5.5",
      "Qwen/Qwen3.7-Max",
      "zai-org/GLM-5-FP8",
      "zai-org/GLM-5.1-FP8",
      "zai-org/GLM-5.2-FP8"
    ]
  },
  {
    id: "google",
    name: "Google",
    apiKeyEnvVars: ["GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
    models: [
      "deep-research-max-preview-04-2026",
      "deep-research-preview-04-2026",
      "gemini-2.5-computer-use-preview-10-2025",
      "gemini-2.5-flash",
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash-preview-tts",
      "gemini-2.5-pro",
      "gemini-2.5-pro-preview-tts",
      "gemini-3-flash-preview",
      "gemini-3-pro-image",
      "gemini-3-pro-image-preview",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-image-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite-image",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-flash-live-preview",
      "gemini-3.1-flash-tts-preview",
      "gemini-3.1-pro-preview",
      "gemini-3.1-pro-preview-customtools",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.5-live-translate-preview",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "gemini-embedding-001",
      "gemini-embedding-2",
      "gemini-flash-latest",
      "gemini-flash-lite-latest",
      "gemini-omni-flash-preview",
      "gemma-4-26b-a4b-it",
      "gemma-4-31b-it",
      "lyria-3-clip-preview",
      "lyria-3-pro-preview",
      "veo-3.1-fast-generate-preview",
      "veo-3.1-generate-preview",
      "veo-3.1-lite-generate-preview"
    ]
  },
  {
    id: "greenpt",
    name: "GreenPT",
    apiKeyEnvVars: ["GREENPT_API_KEY"],
    models: [
      "deepseek-v4-flash-0731",
      "devstral-2-123b-instruct-2512",
      "gemma-3-27b-it",
      "gemma4",
      "glm-5.1",
      "glm-5.2",
      "glm-5.2-caveman",
      "glm-5.2-caveman-lite",
      "glm-5.2-caveman-ultra",
      "glm-5.2-honey",
      "glm-5.2-honey-lite",
      "glm-5.2-honey-ultra",
      "glm-5.2-ponytail",
      "glm-5.2-ponytail-lite",
      "glm-5.2-ponytail-ultra",
      "gpt-oss-120b",
      "green-l",
      "green-l-raw",
      "green-r",
      "green-r-raw",
      "green-s",
      "green-s-pro",
      "holo2-30b-a3b",
      "kimi-k2.6",
      "kimi-k2.6-fast",
      "kimi-k2.7-code",
      "kimi-k3",
      "llama-3.3-70b-instruct",
      "minimax-m2.5",
      "mistral-medium-3.5-128b",
      "mistral-small-3.2-24b-instruct-2506",
      "pixtral-12b-2409",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3.5-397b-a17b",
      "qwen3.6-35b-a3b",
      "voxtral-small-24b-2507"
    ]
  },
  {
    id: "groq",
    name: "Groq",
    apiKeyEnvVars: ["GROQ_API_KEY"],
    models: [
      "allam-2-7b",
      "canopylabs/orpheus-arabic-saudi",
      "canopylabs/orpheus-v1-english",
      "groq/compound",
      "groq/compound-mini",
      "llama-3.1-8b-instant",
      "llama-3.3-70b-versatile",
      "meta-llama/llama-prompt-guard-2-22m",
      "meta-llama/llama-prompt-guard-2-86m",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-20b",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.8-27b",
      "whisper-large-v3",
      "whisper-large-v3-turbo"
    ]
  },
  {
    id: "helicone",
    name: "Helicone",
    apiKeyEnvVars: ["HELICONE_API_KEY"],
    models: [
      "chatgpt-4o-latest",
      "claude-3-haiku-20240307",
      "claude-3.5-haiku",
      "claude-3.5-sonnet-v2",
      "claude-3.7-sonnet",
      "claude-4.5-haiku",
      "claude-4.5-opus",
      "claude-4.5-sonnet",
      "claude-haiku-4-5-20251001",
      "claude-opus-4",
      "claude-opus-4-1",
      "claude-opus-4-1-20250805",
      "claude-sonnet-4",
      "claude-sonnet-4-5-20250929",
      "deepseek-r1-distill-llama-70b",
      "deepseek-reasoner",
      "deepseek-tng-r1t2-chimera",
      "deepseek-v3",
      "deepseek-v3.1-terminus",
      "deepseek-v3.2",
      "ernie-4.5-21b-a3b-thinking",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3-pro-preview",
      "gemma-3-12b-it",
      "gemma2-9b-it",
      "glm-4.6",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-mini-2025-04-14",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-chat-latest",
      "gpt-5-codex",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-pro",
      "gpt-5.1",
      "gpt-5.1-chat-latest",
      "gpt-5.1-codex",
      "gpt-5.1-codex-mini",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "grok-3",
      "grok-3-mini",
      "grok-4",
      "grok-4-1-fast-non-reasoning",
      "grok-4-1-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-4-fast-reasoning",
      "grok-code-fast-1",
      "hermes-2-pro-llama-3-8b",
      "kimi-k2-0711",
      "kimi-k2-0905",
      "kimi-k2-thinking",
      "llama-3.1-8b-instant",
      "llama-3.1-8b-instruct",
      "llama-3.1-8b-instruct-turbo",
      "llama-3.3-70b-instruct",
      "llama-3.3-70b-versatile",
      "llama-4-maverick",
      "llama-4-scout",
      "llama-guard-4",
      "llama-prompt-guard-2-22m",
      "llama-prompt-guard-2-86m",
      "mistral-large-2411",
      "mistral-nemo",
      "mistral-small",
      "o1",
      "o1-mini",
      "o3",
      "o3-mini",
      "o3-pro",
      "o4-mini",
      "qwen2.5-coder-7b-fast",
      "qwen3-235b-a22b-thinking",
      "qwen3-30b-a3b",
      "qwen3-32b",
      "qwen3-coder",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-next-80b-a3b-instruct",
      "qwen3-vl-235b-a22b-instruct",
      "sonar",
      "sonar-deep-research",
      "sonar-pro",
      "sonar-reasoning",
      "sonar-reasoning-pro"
    ]
  },
  {
    id: "hetzner",
    name: "Hetzner",
    apiKeyEnvVars: ["HETZNER_API_KEY"],
    models: ["Qwen/Qwen3.6-35B-A3B-FP8", "Qwen3.8-27B"]
  },
  {
    id: "hpc-ai",
    name: "HPC-AI",
    apiKeyEnvVars: ["HPC_AI_API_KEY"],
    models: [
      "anthropic/claude-opus-4.7",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "minimax/minimax-m2.5",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.7-code",
      "openai/gpt-5.5",
      "zai-org/glm-5.1",
      "zai-org/glm-5.2"
    ]
  },
  {
    id: "huggingface",
    name: "Hugging Face",
    apiKeyEnvVars: ["HF_TOKEN"],
    models: [
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-R1-0528",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3-0324",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Flash-Vision-Exp",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "google/gemma-4-26B-A4B-it",
      "google/gemma-4-31B-it",
      "meta-llama/Llama-3.1-8B-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
      "MiniMaxAI/MiniMax-M2",
      "MiniMaxAI/MiniMax-M2.1",
      "MiniMaxAI/MiniMax-M2.5",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2-Instruct",
      "moonshotai/Kimi-K2-Instruct-0905",
      "moonshotai/Kimi-K2-Thinking",
      "moonshotai/Kimi-K2.5",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "Qwen/Qwen2.5-Coder-32B-Instruct",
      "Qwen/Qwen3-235B-A22B",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-30B-A3B",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-Coder-30B-A3B-Instruct",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "Qwen/Qwen3-Coder-Next",
      "Qwen/Qwen3-Embedding-4B",
      "Qwen/Qwen3-Embedding-8B",
      "Qwen/Qwen3-Next-80B-A3B-Instruct",
      "Qwen/Qwen3-Next-80B-A3B-Thinking",
      "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Thinking",
      "Qwen/Qwen3.5-122B-A10B",
      "Qwen/Qwen3.5-27B",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.6-35B-A3B",
      "Qwen/Qwen3.8-2.4T-A95B",
      "Qwen/Qwen3.8-27B",
      "stepfun-ai/Step-3.5-Flash",
      "stepfun-ai/Step-3.7-Flash",
      "tencent/Hy3",
      "thinkingmachines/Inkling",
      "thinkingmachines/Inkling-Small",
      "XiaomiMiMo/MiMo-V2-Flash",
      "XiaomiMiMo/MiMo-V2.5",
      "XiaomiMiMo/MiMo-V2.5-Pro",
      "zai-org/GLM-4.5",
      "zai-org/GLM-4.5-Air",
      "zai-org/GLM-4.5V",
      "zai-org/GLM-4.6",
      "zai-org/GLM-4.6V-Flash",
      "zai-org/GLM-4.7",
      "zai-org/GLM-4.7-Flash",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "iflowcn",
    name: "iFlow",
    apiKeyEnvVars: ["IFLOW_API_KEY"],
    models: [
      "deepseek-r1",
      "deepseek-v3",
      "deepseek-v3.2",
      "glm-4.6",
      "kimi-k2",
      "kimi-k2-0905",
      "qwen3-235b",
      "qwen3-235b-a22b-instruct",
      "qwen3-235b-a22b-thinking-2507",
      "qwen3-32b",
      "qwen3-coder-plus",
      "qwen3-max",
      "qwen3-max-preview",
      "qwen3-vl-plus"
    ]
  },
  {
    id: "impossibl",
    name: "Impossibl",
    apiKeyEnvVars: ["IMPOSSIBL_API_KEY"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-5",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "cerebras/gpt-oss-120b",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "fireworks/glm-5.2",
      "fireworks/gpt-oss-120b",
      "fireworks/gpt-oss-20b",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "groq/gpt-oss-120b",
      "groq/gpt-oss-20b",
      "moonshotai/kimi-k3",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-codex",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/o1",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-max-preview",
      "thinkingmachines/inkling",
      "xai/grok-4.20-0309-non-reasoning",
      "xai/grok-4.20-0309-reasoning",
      "xai/grok-4.3",
      "xai/grok-4.5",
      "xai/grok-build-0.1",
      "xiaomi/mimo-v2.5",
      "zai/glm-4.5",
      "zai/glm-4.5-air",
      "zai/glm-4.6",
      "zai/glm-4.7",
      "zai/glm-5",
      "zai/glm-5-turbo",
      "zai/glm-5.1",
      "zai/glm-5.2"
    ]
  },
  {
    id: "inception",
    name: "Inception",
    apiKeyEnvVars: ["INCEPTION_API_KEY"],
    models: ["mercury-2", "mercury-edit-2"]
  },
  {
    id: "inceptron",
    name: "Inceptron",
    apiKeyEnvVars: ["INCEPTRON_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "zai-org/GLM-5.2"
    ]
  },
  {
    id: "inference",
    name: "Inference",
    apiKeyEnvVars: ["INFERENCE_API_KEY"],
    models: [
      "google/gemma-3",
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.2-1b-instruct",
      "meta/llama-3.2-3b-instruct",
      "mistral/mistral-nemo-12b-instruct",
      "osmosis/osmosis-structure-0.6b",
      "qwen/qwen-2.5-7b-vision-instruct",
      "qwen/qwen3-embedding-4b"
    ]
  },
  {
    id: "inferx",
    name: "InferX",
    apiKeyEnvVars: ["INFERX_API_KEY"],
    models: [
      "Agents-A1",
      "deepseek-v4-flash",
      "Devstral-2-123B-Instruct-2512-int4-AutoRound",
      "gemma-4-31B-it-fp8",
      "mimo-v25",
      "Ornith-1.0-35B-FP8",
      "Qwen3-Coder-Next-FP8",
      "Qwen3-Coder-Next-FP8-no-thinking",
      "Qwen3-Embedding-8B",
      "Qwen3.6-27B-FP8",
      "Qwen3.6-35B-A3B-FP8",
      "Qwen3.6-35B-A3B-fp8-no-thinking"
    ]
  },
  {
    id: "infomaniak",
    name: "Infomaniak",
    apiKeyEnvVars: ["INFOMANIAK_API_KEY"],
    models: [
      "bge_multilingual_gemma2",
      "google/gemma-4-31B-it",
      "mini_lm_l12_v2",
      "mistralai/Ministral-3-14B-Instruct-2512",
      "mistralai/Mistral-Small-4-119B-2603",
      "moonshotai/Kimi-K2.6",
      "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8",
      "Qwen/Qwen3.5-122B-A10B-FP8",
      "Qwen/Qwen3.5-397B-A17B-FP8",
      "swiss-ai/Apertus-v1.5-70B"
    ]
  },
  {
    id: "io-net",
    name: "IO.NET",
    apiKeyEnvVars: ["IOINTELLIGENCE_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-R1-0528",
      "Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar",
      "meta-llama/Llama-3.2-90B-Vision-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
      "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
      "mistralai/Devstral-Small-2505",
      "mistralai/Magistral-Small-2506",
      "mistralai/Mistral-Large-Instruct-2411",
      "mistralai/Mistral-Nemo-Instruct-2407",
      "moonshotai/Kimi-K2-Instruct-0905",
      "moonshotai/Kimi-K2-Thinking",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "Qwen/Qwen2.5-VL-32B-Instruct",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-Next-80B-A3B-Instruct",
      "zai-org/GLM-4.6"
    ]
  },
  {
    id: "iteracompute",
    name: "IteraCompute",
    apiKeyEnvVars: ["ITERACOMPUTE_API_KEY"],
    models: ["iteracompute/ornith-1.5-35b-a3b", "iteracompute/qwen3.8-27b"]
  },
  {
    id: "jalapeno",
    name: "Jalapeno Cloud",
    apiKeyEnvVars: ["JALAPENO_API_KEY"],
    models: [
      "DeepSeek-V4-Flash",
      "DeepSeek-V4-Pro",
      "GLM-5.1",
      "GLM-5.2",
      "Hy3",
      "Kimi-K2.5",
      "Kimi-K2.7-Code",
      "Kimi-K3",
      "MiniMax-M3",
      "Qwen3-Next-80B-A3B-Instruct",
      "Qwen3-Next-80B-A3B-Thinking",
      "Qwen3-VL-235B-A22B-Instruct",
      "Qwen3-VL-235B-A22B-Thinking",
      "Qwen3.5-122B-A10B",
      "Qwen3.5-27B",
      "Qwen3.5-35B-A3B",
      "Qwen3.5-397B-A17B"
    ]
  },
  {
    id: "jiekou",
    name: "Jiekou.AI",
    apiKeyEnvVars: ["JIEKOU_API_KEY"],
    models: [
      "baidu/ernie-4.5-300b-a47b-paddle",
      "baidu/ernie-4.5-vl-424b-a47b",
      "claude-haiku-4-5-20251001",
      "claude-opus-4-1-20250805",
      "claude-opus-4-20250514",
      "claude-opus-4-5-20251101",
      "claude-opus-4-6",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-5-20250929",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-v3-0324",
      "deepseek/deepseek-v3.1",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash-lite-preview-06-17",
      "gemini-2.5-flash-lite-preview-09-2025",
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.5-pro",
      "gemini-2.5-pro-preview-06-05",
      "gemini-3-flash-preview",
      "gemini-3-pro-preview",
      "gpt-5-chat-latest",
      "gpt-5-codex",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-pro",
      "gpt-5.1",
      "gpt-5.1-codex",
      "gpt-5.1-codex-max",
      "gpt-5.1-codex-mini",
      "gpt-5.2",
      "gpt-5.2-codex",
      "gpt-5.2-pro",
      "grok-4-0709",
      "grok-4-1-fast-non-reasoning",
      "grok-4-1-fast-reasoning",
      "grok-4-fast-non-reasoning",
      "grok-4-fast-reasoning",
      "grok-code-fast-1",
      "minimax/minimax-m2.1",
      "minimaxai/minimax-m1-80k",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-instruct",
      "moonshotai/kimi-k2.5",
      "o3",
      "o3-mini",
      "o4-mini",
      "qwen/qwen3-235b-a22b-fp8",
      "qwen/qwen3-235b-a22b-instruct-2507",
      "qwen/qwen3-235b-a22b-thinking-2507",
      "qwen/qwen3-30b-a3b-fp8",
      "qwen/qwen3-32b-fp8",
      "qwen/qwen3-coder-480b-a35b-instruct",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "xiaomimimo/mimo-v2-flash",
      "zai-org/glm-4.5",
      "zai-org/glm-4.5v",
      "zai-org/glm-4.7",
      "zai-org/glm-4.7-flash"
    ]
  },
  {
    id: "kenari",
    name: "Kenari",
    apiKeyEnvVars: ["KENARI_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "deepseek-v4-flash",
      "deepseek-v4-flash:free",
      "deepseek-v4-pro",
      "gemini-2-5-flash",
      "gemini-2-5-flash-lite",
      "gemini-3-1-flash-lite",
      "gemini-3-1-flash-tts",
      "gemini-3-1-pro",
      "gemini-3-5-flash",
      "gemini-3-6-flash",
      "gemini-3-7-flash",
      "gemma-4-31b-it",
      "glm-4-7-flash:free",
      "glm-5-1",
      "glm-5-2",
      "glm-5-3",
      "glm-5-3-flash",
      "gpt-5-4-mini",
      "gpt-5-5",
      "gpt-5-6-luna",
      "gpt-5-6-sol",
      "gpt-5-6-terra",
      "gpt-image-2",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "grok-4-5",
      "grok-4-6",
      "grok-build-0-1",
      "grok-imagine-image-2-0",
      "hy3",
      "hy3:free",
      "kimi-k2-6",
      "kimi-k2-6:free",
      "kimi-k2-7-code",
      "kimi-k2-7-code:free",
      "kimi-k3",
      "mimo-v2-5",
      "mimo-v2-5-pro",
      "mimo-v2-5:free",
      "minimax-m2-7",
      "minimax-m2-7-highspeed",
      "minimax-m3",
      "mistral-large:free",
      "mistral-medium-3-5:free",
      "nemotron-3-nano-30b-a3b",
      "nemotron-3-super-120b-a12b",
      "nemotron-3-super-120b-a12b:free",
      "nemotron-3-ultra-550b-a55b",
      "qwen3-7-plus",
      "qwen3-8-max",
      "step-3-7-flash",
      "step-3-7-flash:free",
      "whisper-large-v3-turbo"
    ]
  },
  {
    id: "kilo",
    name: "Kilo Gateway",
    apiKeyEnvVars: ["KILO_API_KEY"],
    models: [
      "~anthropic/claude-fable-latest",
      "~anthropic/claude-haiku-latest",
      "~anthropic/claude-opus-latest",
      "~anthropic/claude-sonnet-latest",
      "~deepseek/deepseek-v4-flash-latest",
      "~google/gemini-flash-latest",
      "~google/gemini-pro-latest",
      "~moonshotai/kimi-latest",
      "~openai/gpt-latest",
      "~openai/gpt-mini-latest",
      "~x-ai/grok-latest",
      "~z-ai/glm-flash-latest",
      "~z-ai/glm-latest",
      "aion-labs/aion-2.0",
      "aion-labs/aion-3.0",
      "aion-labs/aion-3.0-mini",
      "aion-labs/aion-rp-llama-3.1-8b",
      "amazon/nova-2-lite-v1",
      "amazon/nova-lite-v1",
      "amazon/nova-micro-v1",
      "amazon/nova-premier-v1",
      "amazon/nova-pro-v1",
      "anthracite-org/magnum-v4-72b",
      "anthropic/claude-3-haiku",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "arcee-ai/trinity-large-thinking",
      "baidu/ernie-4.5-vl-424b-a47b",
      "bytedance-seed/seed-1.6",
      "bytedance-seed/seed-1.6-flash",
      "bytedance-seed/seed-2-1-turbo",
      "bytedance-seed/seed-2.0-code",
      "bytedance-seed/seed-2.0-lite",
      "bytedance-seed/seed-2.0-mini",
      "bytedance/ui-tars-1.5-7b",
      "cognitivecomputations/dolphin-mistral-24b-venice-edition",
      "cohere/command-a",
      "cohere/command-r-08-2024",
      "cohere/command-r-plus-08-2024",
      "cohere/command-r7b-12-2024",
      "cohere/north-mini-code:free",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-chat-v3-0324",
      "deepseek/deepseek-chat-v3.1",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-r1-distill-llama-70b",
      "deepseek/deepseek-v3.1-terminus",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-exp",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "dots-studio/dots-3-note-preview:free",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-image",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-pro-preview",
      "google/gemini-2.5-pro-preview-05-06",
      "google/gemini-3-flash-preview",
      "google/gemini-3-pro-image",
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-image",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemma-2-27b-it",
      "google/gemma-3-12b-it",
      "google/gemma-3-27b-it",
      "google/gemma-3-4b-it",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-31b-it",
      "google/lyria-3-clip-preview",
      "google/lyria-3-pro-preview",
      "gryphe/mythomax-l2-13b",
      "ibm-granite/granite-4.0-h-micro",
      "ibm-granite/granite-4.2-8b",
      "inception/mercury-2",
      "inception/mercury-2.5-preview",
      "inclusionai/ling-3.0-flash",
      "inclusionai/ling-3.0-flash-fin",
      "inclusionai/ling-3.0-flash-fin:free",
      "inclusionai/ling-3.0-flash-sante:free",
      "kilo-auto/balanced",
      "kilo-auto/efficient",
      "kilo-auto/free",
      "kilo-auto/frontier",
      "kilo-auto/small",
      "kwaipilot/kat-coder-pro-v2",
      "kwaipilot/kat-coder-pro-v2.5",
      "liquid/lfm-2.5-2.6b:free",
      "mancer/weaver",
      "meituan/longcat-2.0",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "meta-llama/llama-3.2-1b-instruct",
      "meta-llama/llama-3.2-3b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "meta-llama/llama-guard-4-12b",
      "meta/muse-glimmer-30b",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "meta/muse-spark-1.2-contributor",
      "meta/muse-spark-1.3",
      "meta/muse-spark-1.3-contributor",
      "microsoft/phi-4",
      "microsoft/wizardlm-2-8x22b",
      "minimax/minimax-01",
      "minimax/minimax-m1",
      "minimax/minimax-m2",
      "minimax/minimax-m2-her",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7:free",
      "minimax/minimax-m3",
      "minimax/minimax-m3:free",
      "mistralai/codestral-2508",
      "mistralai/devstral-2512",
      "mistralai/ministral-14b-2512",
      "mistralai/ministral-3b-2512",
      "mistralai/ministral-8b-2512",
      "mistralai/mistral-large",
      "mistralai/mistral-large-2407",
      "mistralai/mistral-large-2512",
      "mistralai/mistral-medium-3",
      "mistralai/mistral-medium-3-5",
      "mistralai/mistral-medium-3.1",
      "mistralai/mistral-nemo",
      "mistralai/mistral-saba",
      "mistralai/mistral-small-24b-instruct-2501",
      "mistralai/mistral-small-2603",
      "mistralai/mistral-small-3.1-24b-instruct",
      "mistralai/mistral-small-3.2-24b-instruct",
      "mistralai/mixtral-8x22b-instruct",
      "mistralai/voxtral-small-24b-2507",
      "moonshotai/kimi-k2",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k3",
      "morph/morph-v3-fast",
      "morph/morph-v3-large",
      "nex-agi/nex-n2-mini",
      "nex-agi/nex-n2-pro",
      "nousresearch/hermes-3-llama-3.1-405b",
      "nousresearch/hermes-3-llama-3.1-70b",
      "nousresearch/hermes-4-405b",
      "nousresearch/hermes-4-70b",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3.5-content-safety",
      "nvidia/nemotron-3.5-content-safety:free",
      "nvidia/nemotron-3.5-lightning",
      "nvidia/nemotron-3.5-lightning:free",
      "openai/gpt-3.5-turbo",
      "openai/gpt-3.5-turbo-0613",
      "openai/gpt-3.5-turbo-16k",
      "openai/gpt-3.5-turbo-instruct",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4-turbo-preview",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-05-13",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-4o-mini-2024-07-18",
      "openai/gpt-5",
      "openai/gpt-5-image",
      "openai/gpt-5-image-mini",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-image-2",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-luna-pro",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-sol-discounted",
      "openai/gpt-5.6-sol-pro",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-terra-pro",
      "openai/gpt-6-astra",
      "openai/gpt-6-astra-pro",
      "openai/gpt-audio",
      "openai/gpt-audio-mini",
      "openai/gpt-chat-latest",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-20b",
      "openai/o1",
      "openai/o1-pro",
      "openai/o3",
      "openai/o3-mini",
      "openai/o3-mini-high",
      "openai/o3-pro",
      "openai/o4-mini",
      "openai/o4-mini-high",
      "openrouter/auto",
      "openrouter/bodybuilder",
      "openrouter/free",
      "openrouter/pareto-code",
      "perceptron/perceptron-mk1",
      "perplexity/sonar",
      "perplexity/sonar-deep-research",
      "perplexity/sonar-pro",
      "perplexity/sonar-pro-search",
      "perplexity/sonar-reasoning-pro",
      "poolside/laguna-s-2.1",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1",
      "poolside/laguna-xs-2.1:free",
      "qwen/qwen-2.5-72b-instruct",
      "qwen/qwen-2.5-7b-instruct",
      "qwen/qwen-2.5-coder-32b-instruct",
      "qwen/qwen-plus",
      "qwen/qwen-plus-2025-07-28",
      "qwen/qwen2.5-vl-72b-instruct",
      "qwen/qwen3-14b",
      "qwen/qwen3-235b-a22b",
      "qwen/qwen3-235b-a22b-2507",
      "qwen/qwen3-235b-a22b-thinking-2507",
      "qwen/qwen3-30b-a3b",
      "qwen/qwen3-30b-a3b-instruct-2507",
      "qwen/qwen3-30b-a3b-thinking-2507",
      "qwen/qwen3-32b",
      "qwen/qwen3-8b",
      "qwen/qwen3-coder",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3-max-thinking",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3-vl-30b-a3b-instruct",
      "qwen/qwen3-vl-30b-a3b-thinking",
      "qwen/qwen3-vl-32b-instruct",
      "qwen/qwen3-vl-8b-instruct",
      "qwen/qwen3-vl-8b-thinking",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-9b",
      "qwen/qwen3.5-flash-02-23",
      "qwen/qwen3.5-plus-02-15",
      "qwen/qwen3.5-plus-20260420",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.6-35b-a3b",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-max-preview",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-flash",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-2.4t-a95b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.8-flash",
      "qwen/qwen3.8-max-0902",
      "rekaai/reka-edge",
      "rekaai/reka-flash-3",
      "relace/relace-apply-3",
      "relace/relace-search",
      "sakana/fugu-ultra",
      "sakana/sakana-namazu",
      "sao10k/l3-lunaris-8b",
      "sao10k/l3.1-euryale-70b",
      "sao10k/l3.3-euryale-70b",
      "stealth/claude-opus-4.6",
      "stealth/claude-opus-4.7",
      "stealth/claude-opus-4.8",
      "stealth/claude-sonnet-4.6",
      "stealth/qwen3.6-plus",
      "stepfun/step-3.5-flash",
      "stepfun/step-3.7-flash",
      "stepfun/step-3.7-flash:free",
      "tencent/hunyuan-a13b-instruct",
      "tencent/hy-mt2-1.8b",
      "tencent/hy-mt2-30b-a3b",
      "tencent/hy-mt2-7b",
      "tencent/hy3",
      "tencent/hy3-preview",
      "tencent/hy4-preview",
      "thedrummer/cydonia-24b-v4.1",
      "thedrummer/skyfall-36b-v2",
      "thedrummer/unslopnemo-12b",
      "thinkingmachines/inkling",
      "thinkingmachines/inkling-small",
      "thinkingmachines/inkling-small:free",
      "thinkingmachines/inkling:free",
      "undi95/remm-slerp-l2-13b",
      "upstage/solar-pro-3",
      "upstage/solar-pro4",
      "writer/palmyra-x5",
      "x-ai/grok-4.20",
      "x-ai/grok-4.20-multi-agent",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-4.6",
      "x-ai/grok-build-0.1",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "z-ai/glm-4.5",
      "z-ai/glm-4.5-air",
      "z-ai/glm-4.5v",
      "z-ai/glm-4.6",
      "z-ai/glm-4.6v",
      "z-ai/glm-4.7",
      "z-ai/glm-4.7-flash",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash",
      "z-ai/glm-5v-turbo"
    ]
  },
  {
    id: "kimi-for-coding",
    name: "Kimi For Coding",
    apiKeyEnvVars: ["KIMI_API_KEY"],
    models: ["k3", "k3-256k", "kimi-for-coding", "kimi-for-coding-highspeed"]
  },
  {
    id: "klokintegration",
    name: "klokintegration.se",
    apiKeyEnvVars: ["KLOKINTEGRATION_API_KEY"],
    models: ["Kloker", "Kloker-Integration-Architect", "Kloker-Integration-Developer"]
  },
  {
    id: "kosmik",
    name: "Kosmik Compute",
    apiKeyEnvVars: ["KOSMIK_API_KEY"],
    models: ["qwen/qwen3.8-27b"]
  },
  {
    id: "kuae-cloud-coding-plan",
    name: "KUAE Cloud Coding Plan",
    apiKeyEnvVars: ["KUAE_API_KEY"],
    models: ["GLM-4.7"]
  },
  {
    id: "lilac",
    name: "Lilac",
    apiKeyEnvVars: ["LILAC_API_KEY"],
    models: [
      "google/gemma-4-31b-it",
      "minimaxai/minimax-m3",
      "moonshotai/kimi-k2.6",
      "zai-org/glm-5.2"
    ]
  },
  {
    id: "llama",
    name: "Llama",
    apiKeyEnvVars: ["LLAMA_API_KEY"],
    models: [
      "cerebras-llama-4-maverick-17b-128e-instruct",
      "cerebras-llama-4-scout-17b-16e-instruct",
      "groq-llama-4-maverick-17b-128e-instruct",
      "llama-3.3-70b-instruct",
      "llama-3.3-8b-instruct",
      "llama-4-maverick-17b-128e-instruct-fp8",
      "llama-4-scout-17b-16e-instruct-fp8"
    ]
  },
  {
    id: "llmgateway-providers",
    name: "LLM Gateway",
    apiKeyEnvVars: ["LLMGATEWAY_API_KEY"],
    models: [
      "alibaba/deepseek-v4-flash",
      "alibaba/deepseek-v4-pro",
      "alibaba/glm-5",
      "alibaba/glm-5.2",
      "alibaba/kimi-k2.5",
      "alibaba/qwen-coder-plus",
      "alibaba/qwen-flash",
      "alibaba/qwen-max",
      "alibaba/qwen-omni-turbo",
      "alibaba/qwen-plus",
      "alibaba/qwen-plus-latest",
      "alibaba/qwen3-coder-flash",
      "alibaba/qwen3-coder-plus",
      "alibaba/qwen3-max",
      "alibaba/qwen3-vl-flash",
      "alibaba/qwen3-vl-plus",
      "alibaba/qwen3.6-35b-a3b",
      "alibaba/qwen3.6-flash",
      "alibaba/qwen3.6-max-preview",
      "alibaba/qwen3.6-plus",
      "alibaba/qwen3.7-flash",
      "alibaba/qwen3.7-max",
      "alibaba/qwen3.7-plus",
      "alibaba/qwen3.8-flash",
      "alibaba/qwen3.8-max",
      "alibaba/qwen35-397b-a17b",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-haiku-4-5-20251001",
      "anthropic/claude-opus-4-5-20251101",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-5-20250929",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "aws-bedrock/claude-fable-5",
      "aws-bedrock/claude-haiku-4-5",
      "aws-bedrock/claude-haiku-4-5-20251001",
      "aws-bedrock/claude-opus-4-1-20250805",
      "aws-bedrock/claude-opus-4-5-20251101",
      "aws-bedrock/claude-opus-4-6",
      "aws-bedrock/claude-opus-4-7",
      "aws-bedrock/claude-opus-4-8",
      "aws-bedrock/claude-opus-5",
      "aws-bedrock/claude-sonnet-4-5",
      "aws-bedrock/claude-sonnet-4-5-20250929",
      "aws-bedrock/claude-sonnet-4-6",
      "aws-bedrock/claude-sonnet-5",
      "aws-bedrock/grok-4-3",
      "aws-bedrock/grok-4-6",
      "aws-bedrock/llama-3.1-70b-instruct",
      "aws-bedrock/llama-4-maverick-17b-instruct",
      "aws-bedrock/llama-4-scout-17b-instruct",
      "aws-mantle/gpt-5.6-luna",
      "aws-mantle/gpt-5.6-sol",
      "aws-mantle/gpt-5.6-terra",
      "azure-ai-foundry/grok-4-1-fast-non-reasoning",
      "azure-ai-foundry/grok-4-1-fast-reasoning",
      "azure-ai-foundry/grok-4-3",
      "azure-anthropic/claude-fable-5",
      "azure-anthropic/claude-opus-4-6",
      "azure-anthropic/claude-opus-4-7",
      "azure-anthropic/claude-opus-4-8",
      "azure-anthropic/claude-opus-5",
      "azure-anthropic/claude-sonnet-5",
      "azure/gpt-3.5-turbo",
      "azure/gpt-4",
      "azure/gpt-4-turbo",
      "azure/gpt-4.1",
      "azure/gpt-4.1-mini",
      "azure/gpt-4.1-nano",
      "azure/gpt-4o",
      "azure/gpt-5",
      "azure/gpt-5-mini",
      "azure/gpt-5-nano",
      "azure/gpt-5.1",
      "azure/gpt-5.1-codex",
      "azure/gpt-5.1-codex-mini",
      "azure/gpt-5.2",
      "azure/gpt-5.2-codex",
      "azure/gpt-5.2-pro",
      "azure/gpt-5.3-codex",
      "azure/gpt-5.4",
      "azure/gpt-5.4-mini",
      "azure/gpt-5.4-nano",
      "azure/gpt-5.4-pro",
      "azure/gpt-5.5",
      "azure/gpt-5.6-luna",
      "azure/gpt-5.6-sol",
      "azure/gpt-5.6-terra",
      "azure/gpt-6-astra",
      "azure/gpt-oss-120b",
      "azure/o1",
      "azure/o3",
      "azure/o3-mini",
      "azure/o4-mini",
      "baidu/deepseek-v4-flash",
      "baidu/deepseek-v4-pro",
      "baidu/glm-5",
      "baidu/glm-5.1",
      "baidu/glm-5.2",
      "baidu/glm-5.3",
      "baidu/kimi-k2.6",
      "bytedance/deepseek-v3.2",
      "bytedance/deepseek-v4-flash",
      "bytedance/deepseek-v4-pro",
      "bytedance/glm-4.7",
      "bytedance/glm-5.2",
      "bytedance/gpt-oss-120b",
      "bytedance/seed-1-6-250615",
      "bytedance/seed-1-6-250915",
      "bytedance/seed-1-6-flash-250715",
      "bytedance/seed-1-8-251228",
      "canopywave/deepseek-v4-flash",
      "canopywave/deepseek-v4-pro",
      "canopywave/glm-5.2",
      "canopywave/kimi-k2.6",
      "canopywave/kimi-k3",
      "cerebras/gemma-4-31b-it",
      "cerebras/glm-4.7",
      "cerebras/gpt-oss-120b",
      "cerebras/llama-3.3-70b-instruct",
      "cerebras/qwen3-235b-a22b-instruct-2507",
      "consensusprotocol/deepseek-v4-flash",
      "consensusprotocol/glm-5.3-flash",
      "consensusprotocol/gpt-oss-20b",
      "consensusprotocol/Qwen3.8-27B",
      "deepinfra/deepseek-v3.2",
      "deepinfra/deepseek-v4-flash",
      "deepinfra/deepseek-v4-pro",
      "deepinfra/gemma-4-26b-a4b-it",
      "deepinfra/gemma-4-31b-it",
      "deepinfra/glm-5.1",
      "deepinfra/hy3",
      "deepinfra/ling-3.0-flash",
      "deepinfra/mimo-v2.5",
      "deepinfra/mimo-v2.5-pro",
      "deepinfra/nemotron-3-ultra-550b",
      "deepinfra/qwen3-vl-235b-a22b-instruct",
      "deepinfra/qwen3-vl-30b-a3b-instruct",
      "deepinfra/qwen3.5-9b",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "embercloud/glm-4.5",
      "embercloud/glm-4.5-air",
      "embercloud/glm-4.7",
      "embercloud/glm-4.7-flash",
      "embercloud/glm-5",
      "embercloud/glm-5.1",
      "embercloud/glm-5.2",
      "embercloud/kimi-k2.5",
      "embercloud/qwen3-coder-next",
      "fireworks/deepseek-v4-flash",
      "fireworks/deepseek-v4-pro",
      "fireworks/kimi-k3",
      "fireworks/kimi-k3-fast",
      "gonka24/deepseek-v4-flash",
      "gonka24/kimi-k2.6",
      "gonka24/minimax-m2.7",
      "google-ai-studio/gemini-2.5-flash",
      "google-ai-studio/gemini-2.5-flash-lite",
      "google-ai-studio/gemini-2.5-pro",
      "google-ai-studio/gemini-3-flash-preview",
      "google-ai-studio/gemini-3.1-flash-lite",
      "google-ai-studio/gemini-3.1-pro-preview",
      "google-ai-studio/gemini-3.5-flash",
      "google-ai-studio/gemini-3.5-flash-lite",
      "google-ai-studio/gemini-3.6-flash",
      "google-ai-studio/gemini-3.7-flash",
      "google-ai-studio/gemini-3.8-flash",
      "google-ai-studio/gemini-pro-latest",
      "google-vertex/gemini-2.5-flash",
      "google-vertex/gemini-2.5-flash-lite",
      "google-vertex/gemini-2.5-pro",
      "google-vertex/gemini-3-flash-preview",
      "google-vertex/gemini-3.1-flash-lite",
      "google-vertex/gemini-3.1-pro-preview",
      "google-vertex/gemini-3.5-flash",
      "google-vertex/gemini-3.5-flash-lite",
      "google-vertex/gemini-3.6-flash",
      "google-vertex/gemini-3.7-flash",
      "google-vertex/gemini-3.8-flash",
      "groq/gpt-oss-120b",
      "groq/gpt-oss-20b",
      "inference.net/llama-3.2-11b-instruct",
      "meta-contributor/muse-spark-1.2-contributor",
      "meta-contributor/muse-spark-1.3-contributor",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "meta/muse-spark-1.3",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.1-lightning",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "minimax/minimax-text-01",
      "mistral/codestral-2508",
      "mistral/devstral-2512",
      "mistral/ministral-14b-2512",
      "mistral/ministral-3b-2512",
      "mistral/ministral-8b-2512",
      "mistral/mistral-large-2512",
      "mistral/mistral-large-latest",
      "mistral/mistral-small-2506",
      "moonshot/kimi-k2.5",
      "moonshot/kimi-k2.6",
      "moonshot/kimi-k2.7-code",
      "moonshot/kimi-k2.7-code-highspeed",
      "moonshot/kimi-k3",
      "novita/deepseek-v3.2",
      "novita/deepseek-v4-flash",
      "novita/ernie-4.5-vl-424b-a47b",
      "novita/gemma-4-26b-a4b-it",
      "novita/gemma-4-31b-it",
      "novita/glm-4.5v",
      "novita/glm-4.6",
      "novita/glm-4.6v",
      "novita/glm-4.7",
      "novita/glm-5",
      "novita/glm-5.1",
      "novita/glm-5.2",
      "novita/glm-5.3",
      "novita/glm-5.3-flash",
      "novita/hy3",
      "novita/kimi-k2",
      "novita/kimi-k2.6",
      "novita/kimi-k2.7-code",
      "novita/kimi-k3",
      "novita/ling-3.0-flash",
      "novita/llama-3-70b-instruct",
      "novita/llama-3.2-3b-instruct",
      "novita/llama-3.3-70b-instruct",
      "novita/llama-4-maverick-17b-instruct",
      "novita/llama-4-scout-17b-instruct",
      "novita/mimo-v2.5",
      "novita/mimo-v2.5-pro",
      "novita/minimax-m2.1",
      "novita/minimax-m2.5",
      "novita/minimax-m2.7",
      "novita/qwen3-235b-a22b-fp8",
      "novita/qwen3-235b-a22b-instruct-2507",
      "novita/qwen3-235b-a22b-thinking-2507",
      "novita/qwen3-coder-30b-a3b-instruct",
      "novita/qwen3-coder-480b-a35b-instruct",
      "novita/qwen3-max",
      "novita/qwen3-next-80b-a3b-instruct",
      "novita/qwen3-vl-235b-a22b-instruct",
      "novita/qwen3-vl-235b-a22b-thinking",
      "novita/qwen3-vl-30b-a3b-instruct",
      "novita/qwen3.6-35b-a3b",
      "novita/qwen3.7-max",
      "novita/qwen3.8-27b",
      "novita/qwen3.8-flash",
      "novita/qwen3.8-max",
      "novita/qwen35-397b-a17b",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-4o-mini-transcribe",
      "openai/gpt-4o-transcribe",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.2",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "openai/o1",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "perplexity/sonar",
      "perplexity/sonar-pro",
      "perplexity/sonar-reasoning-pro",
      "quartz/gemini-3.1-pro-preview",
      "ranoai/deepseek-v4-flash",
      "runware/deepseek-v4-flash",
      "runware/deepseek-v4-pro",
      "runware/gemma-4-31b-it",
      "runware/glm-5.2",
      "runware/glm-5.3",
      "runware/glm-5.3-flash",
      "runware/gpt-oss-120b",
      "runware/kimi-k2.6",
      "runware/kimi-k3",
      "sakana/fugu-ultra",
      "scx-ai-gp/glm-5.2",
      "scx-ai-gp/glm-5.2-fast",
      "scx-ai-gp/glm-5.3",
      "scx-ai-gp/glm-5.3-flash",
      "scx-ai-gp/kimi-k2.7-code",
      "scx-ai-gp/kimi-k3",
      "scx-ai-gp/qwen3.8-max",
      "scx-ai/gemma-4-31b-it",
      "scx-ai/gpt-oss-120b",
      "scx-ai/llama-4-maverick-17b-instruct",
      "scx-ai/minimax-m2.7",
      "scx-ai/qwen3-32b",
      "together-ai/deepseek-v4-flash",
      "together-ai/deepseek-v4-pro",
      "together-ai/gemma-4-31b-it",
      "together-ai/glm-4.7",
      "together-ai/gpt-oss-120b",
      "together-ai/gpt-oss-20b",
      "together-ai/kimi-k3",
      "together-ai/minimax-m3",
      "vertex-anthropic/claude-haiku-4-5",
      "vertex-anthropic/claude-opus-4-5-20251101",
      "vertex-anthropic/claude-opus-4-6",
      "vertex-anthropic/claude-opus-4-7",
      "vertex-anthropic/claude-sonnet-4-5",
      "vertex-anthropic/claude-sonnet-4-6",
      "vertex-anthropic/claude-sonnet-5",
      "vertex-openai/deepseek-v3.2",
      "vertex-openai/glm-4.7",
      "vertex-openai/glm-5",
      "vertex-openai/grok-4-20-non-reasoning",
      "vertex-openai/grok-4-20-reasoning",
      "vertex-openai/grok-4-6",
      "vertex-openai/kimi-k2-thinking",
      "vertex-openai/qwen3-235b-a22b-instruct-2507",
      "vertex-openai/qwen3-coder-480b-a35b-instruct",
      "vertex-openai/qwen3-next-80b-a3b-instruct",
      "vertex-openai/qwen3-next-80b-a3b-thinking",
      "xai/grok-4",
      "xai/grok-4-20-beta-0309-non-reasoning",
      "xai/grok-4-20-beta-0309-reasoning",
      "xai/grok-4-3",
      "xai/grok-4-5",
      "xai/grok-4-6",
      "xai/grok-build-0-1",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "zai/glm-4-32b-0414-128k",
      "zai/glm-4.5",
      "zai/glm-4.5-air",
      "zai/glm-4.5-airx",
      "zai/glm-4.5-x",
      "zai/glm-4.5v",
      "zai/glm-4.6",
      "zai/glm-4.6v",
      "zai/glm-4.6v-flashx",
      "zai/glm-4.7",
      "zai/glm-4.7-flashx",
      "zai/glm-5",
      "zai/glm-5.1",
      "zai/glm-5.2",
      "zai/glm-5.3",
      "zai/glm-5.3-flash"
    ]
  },
  {
    id: "llmtech",
    name: "LLM Tech",
    apiKeyEnvVars: ["LLMTECH_API_KEY"],
    models: ["unsloth/Qwen3.8-27B-NVFP4"]
  },
  {
    id: "llmtr",
    name: "LLMTR",
    apiKeyEnvVars: ["LLMTR_API_KEY"],
    models: [
      "gemma-4",
      "google/gemini-2.5-flash-lite",
      "magibu-11b-v8",
      "medgemma-4b",
      "meta/muse-spark-1.2-contributor",
      "mimo/mimo-v2.5",
      "mimo/mimo-v2.5-pro",
      "mistral/voxtral-small-latest",
      "muse-glimmer-30b-tr",
      "perplexity/sonar-deep-research",
      "poolside/laguna-xs-2.1",
      "publicai/apertus-70b-instruct",
      "publicai/apertus-8b-instruct",
      "qwen/qwen-flash",
      "qwen/qwen-plus",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3-vl-plus",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-plus",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-plus",
      "qwen3-6-35b",
      "sakana/fugu-ultra",
      "thinkingmachines/inkling",
      "thinkingmachines/inkling-small",
      "trendyol-asure-12b",
      "upstage/solar-pro2",
      "upstage/solar-pro3",
      "upstage/solar-pro4"
    ]
  },
  {
    id: "lmstudio",
    name: "LMStudio",
    apiKeyEnvVars: ["LMSTUDIO_API_KEY"],
    models: ["openai/gpt-oss-20b", "qwen/qwen3-30b-a3b-2507", "qwen/qwen3-coder-30b"]
  },
  {
    id: "longcat",
    name: "LongCat",
    apiKeyEnvVars: ["LONGCAT_API_KEY"],
    models: ["LongCat-2.0"]
  },
  {
    id: "lucidquery",
    name: "LucidQuery",
    apiKeyEnvVars: ["LUCIDQUERY_API_KEY"],
    models: [
      "lucidnova-rf1-100b",
      "lucidquery-agi-01-frontier",
      "lucidquery-agi-01-swift",
      "lucidquery-nexus-coder"
    ]
  },
  {
    id: "lynkr",
    name: "Lynkr",
    apiKeyEnvVars: ["LYNKR_API_KEY"],
    models: ["lynkr-auto"]
  },
  {
    id: "meganova",
    name: "Meganova",
    apiKeyEnvVars: ["MEGANOVA_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-R1-0528",
      "deepseek-ai/DeepSeek-V3-0324",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V3.2-Exp",
      "meta-llama/Llama-3.3-70B-Instruct",
      "MiniMaxAI/MiniMax-M2.1",
      "MiniMaxAI/MiniMax-M2.5",
      "mistralai/Mistral-Nemo-Instruct-2407",
      "mistralai/Mistral-Small-3.2-24B-Instruct-2506",
      "moonshotai/Kimi-K2-Thinking",
      "moonshotai/Kimi-K2.5",
      "Qwen/Qwen2.5-VL-32B-Instruct",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3.5-Plus",
      "XiaomiMiMo/MiMo-V2-Flash",
      "zai-org/GLM-4.6",
      "zai-org/GLM-4.7",
      "zai-org/GLM-5"
    ]
  },
  {
    id: "merge-gateway",
    name: "Merge Gateway",
    apiKeyEnvVars: ["MERGE_GATEWAY_API_KEY"],
    models: [
      "anthropic/claude-3-7-sonnet-20250219",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-haiku-4-5-20251001",
      "anthropic/claude-opus-4-1-20250805",
      "anthropic/claude-opus-4-20250514",
      "anthropic/claude-opus-4-5-20251101",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4-20250514",
      "anthropic/claude-sonnet-4-5-20250929",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "bytedance/dola-seed-2.0-code",
      "bytedance/dola-seed-2.0-code-preview",
      "bytedance/dola-seed-2.0-lite",
      "bytedance/dola-seed-2.0-mini",
      "bytedance/dola-seed-2.0-pro",
      "cohere/command-a-03-2025",
      "cohere/command-r-08-2024",
      "cohere/command-r-plus-08-2024",
      "cohere/command-r7b-12-2024",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-v3",
      "deepseek/deepseek-v3.1",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-0731-fast",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0423",
      "deepseek/deepseek-v4-pro-0813",
      "google/gemini-2.5-computer-use-preview-10-2025",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-image",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3-pro-image",
      "google/gemini-3-pro-preview",
      "google/gemini-3.1-flash-image",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemini-embedding-001",
      "google/gemini-flash-latest",
      "google/gemini-flash-lite-latest",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-31b-it",
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.3-70b-instruct",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "mistral/codestral-latest",
      "mistral/devstral-2512",
      "mistral/devstral-medium-2507",
      "mistral/devstral-medium-latest",
      "mistral/devstral-small-2507",
      "mistral/magistral-medium-latest",
      "mistral/mistral-large-2411",
      "mistral/mistral-large-2512",
      "mistral/mistral-large-latest",
      "mistral/mistral-medium-2505",
      "mistral/mistral-medium-latest",
      "mistral/mistral-small-latest",
      "mistral/pixtral-large-latest",
      "moonshot/kimi-k2.5",
      "moonshot/kimi-k2.6",
      "moonshot/kimi-k2.7-code",
      "moonshot/kimi-k2.7-code-highspeed",
      "moonshot/kimi-k3",
      "moonshotai/kimi-k2-thinking",
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "nvidia/nemotron-nano-9b-v2",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-05-13",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-chat-latest",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.1",
      "openai/gpt-5.1-chat-latest",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat-latest",
      "openai/gpt-5.3-chat-latest",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.5",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-120b",
      "openai/o1",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "qwen/qwen-flash",
      "qwen/qwen-plus",
      "qwen/qwen3-235b-a22b",
      "qwen/qwen3-235b-a22b-instruct-2507",
      "qwen/qwen3-30b-a3b",
      "qwen/qwen3-32b",
      "qwen/qwen3-coder-480b-a35b-instruct",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3-vl-plus",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-9b",
      "qwen/qwen3.5-flash",
      "qwen/qwen3.5-plus",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.6-35b-a3b",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-max-preview",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-2.4t-a95b",
      "qwen/qwen3.8-max",
      "sakana/fugu-ultra",
      "sakana/sakana-namazu",
      "thinkingmachines/inkling",
      "writer/palmyra-x4",
      "writer/palmyra-x5",
      "xai/grok-4.20-0309-non-reasoning",
      "xai/grok-4.20-0309-reasoning",
      "xai/grok-4.3",
      "xai/grok-4.5",
      "xai/grok-4.6",
      "xai/grok-build-0.1",
      "zai/glm-4.5",
      "zai/glm-4.5-air",
      "zai/glm-4.5v",
      "zai/glm-4.6",
      "zai/glm-4.7",
      "zai/glm-4.7-flash",
      "zai/glm-4.7-flashx",
      "zai/glm-5",
      "zai/glm-5-turbo",
      "zai/glm-5.1",
      "zai/glm-5.2",
      "zai/glm-5.3",
      "zai/glm-5.3-flash"
    ]
  },
  {
    id: "meta",
    name: "Meta",
    apiKeyEnvVars: ["META_MODEL_API_KEY"],
    models: [
      "muse-spark-1.1",
      "muse-spark-1.2",
      "muse-spark-1.2-contributor",
      "muse-spark-1.3",
      "muse-spark-1.3-contributor"
    ]
  },
  {
    id: "minimax",
    name: "MiniMax (minimax.io)",
    apiKeyEnvVars: ["MINIMAX_API_KEY"],
    models: [
      "MiniMax-M2",
      "MiniMax-M2.1",
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "MiniMax-M3"
    ]
  },
  {
    id: "minimax-cn",
    name: "MiniMax (minimaxi.com)",
    apiKeyEnvVars: ["MINIMAX_API_KEY"],
    models: [
      "MiniMax-M2",
      "MiniMax-M2.1",
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "MiniMax-M3"
    ]
  },
  {
    id: "minimax-coding-plan",
    name: "MiniMax Token Plan (minimax.io)",
    apiKeyEnvVars: ["MINIMAX_API_KEY"],
    models: [
      "MiniMax-M2",
      "MiniMax-M2.1",
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "MiniMax-M3"
    ]
  },
  {
    id: "minimax-cn-coding-plan",
    name: "MiniMax Token Plan (minimaxi.com)",
    apiKeyEnvVars: ["MINIMAX_API_KEY"],
    models: [
      "MiniMax-M2",
      "MiniMax-M2.1",
      "MiniMax-M2.5",
      "MiniMax-M2.5-highspeed",
      "MiniMax-M2.7",
      "MiniMax-M2.7-highspeed",
      "MiniMax-M3"
    ]
  },
  {
    id: "mistral",
    name: "Mistral",
    apiKeyEnvVars: ["MISTRAL_API_KEY"],
    models: [
      "codestral-latest",
      "devstral-2512",
      "devstral-latest",
      "devstral-medium-2507",
      "devstral-medium-latest",
      "devstral-small-2505",
      "devstral-small-2507",
      "labs-devstral-small-2512",
      "magistral-medium-latest",
      "magistral-small",
      "ministral-3b-latest",
      "ministral-8b-latest",
      "mistral-embed",
      "mistral-large-2411",
      "mistral-large-2512",
      "mistral-large-latest",
      "mistral-medium-2505",
      "mistral-medium-2508",
      "mistral-medium-2604",
      "mistral-medium-latest",
      "mistral-nemo",
      "mistral-small-2506",
      "mistral-small-2603",
      "mistral-small-latest",
      "open-mistral-7b",
      "open-mistral-nemo",
      "open-mixtral-8x22b",
      "open-mixtral-8x7b",
      "pixtral-12b",
      "pixtral-large-latest",
      "voxtral-mini-latest",
      "voxtral-mini-tts-latest",
      "voxtral-small-latest",
      "zai-glm-5-2"
    ]
  },
  {
    id: "mixlayer",
    name: "Mixlayer",
    apiKeyEnvVars: ["MIXLAYER_API_KEY"],
    models: [
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-9b"
    ]
  },
  {
    id: "moark",
    name: "Moark",
    apiKeyEnvVars: ["MOARK_API_KEY"],
    models: ["GLM-4.7", "MiniMax-M2.1"]
  },
  {
    id: "modal",
    name: "Modal",
    apiKeyEnvVars: ["MODAL_PROXY_TOKEN"],
    models: [
      "moonshotai/Kimi-K3",
      "Qwen/Qwen3.8-2.4T-A95B",
      "thinkingmachines/Inkling-NVFP4",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "model-oracle-ai",
    name: "Model Oracle AI",
    apiKeyEnvVars: ["MODEL_ORACLE_API_KEY"],
    models: [
      "auto",
      "claude-fable-5",
      "claude-haiku-4.5",
      "claude-opus-4.8",
      "claude-sonnet-5",
      "deepseek-v4-pro",
      "glm-5.2",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-5",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.5",
      "o4-mini"
    ]
  },
  {
    id: "modelis",
    name: "Modelis",
    apiKeyEnvVars: ["MODELIS_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "gemini-2.5-flash",
      "gemini-2.5-pro",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus"
    ]
  },
  {
    id: "modelscope",
    name: "ModelScope",
    apiKeyEnvVars: ["MODELSCOPE_API_KEY"],
    models: [
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3-30B-A3B-Thinking-2507",
      "Qwen/Qwen3-Coder-30B-A3B-Instruct",
      "ZhipuAI/GLM-4.5",
      "ZhipuAI/GLM-4.6"
    ]
  },
  {
    id: "moonshotai",
    name: "Moonshot AI",
    apiKeyEnvVars: ["MOONSHOT_API_KEY"],
    models: ["kimi-k2.6", "kimi-k2.7-code", "kimi-k2.7-code-highspeed", "kimi-k3"]
  },
  {
    id: "moonshotai-cn",
    name: "Moonshot AI (China)",
    apiKeyEnvVars: ["MOONSHOT_API_KEY"],
    models: ["kimi-k2.6", "kimi-k2.7-code", "kimi-k2.7-code-highspeed", "kimi-k3"]
  },
  {
    id: "morph",
    name: "Morph",
    apiKeyEnvVars: ["MORPH_API_KEY"],
    models: ["auto", "morph-v3-fast", "morph-v3-large"]
  },
  {
    id: "nan",
    name: "NaN",
    apiKeyEnvVars: ["NAN_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "gemma4",
      "glm5.2",
      "glm5.3-flash",
      "mimo-v2.5",
      "qwen3.6",
      "qwen3.8-flash"
    ]
  },
  {
    id: "nano-gpt",
    name: "NanoGPT",
    apiKeyEnvVars: ["NANO_GPT_API_KEY"],
    models: [
      "abacusai/Dracarys-72B-Instruct",
      "abliteration-ai/abliterated-model",
      "abliteration-ai/abliterated-model-large",
      "abliteration-ai/abliterated-model-large-v2",
      "aion-labs/aion-2.0",
      "aion-labs/aion-3.0",
      "aion-labs/aion-3.0-mini",
      "aion-labs/aion-rp-llama-3.1-8b",
      "alibaba/qwen3.6-27b",
      "alibaba/qwen3.6-27b:thinking",
      "alibaba/qwen3.6-flash",
      "alibaba/qwen3.8-flash",
      "alibaba/qwen3.8-max-0902",
      "amazon/nova-2-lite-v1",
      "amazon/nova-lite-v1",
      "amazon/nova-pro-v1",
      "anthracite-org/magnum-v2-72b",
      "anthracite-org/magnum-v4-72b",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
      "anthropic/claude-fable-latest",
      "anthropic/claude-haiku-latest",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.6:thinking",
      "anthropic/claude-opus-4.6:thinking:low",
      "anthropic/claude-opus-4.6:thinking:max",
      "anthropic/claude-opus-4.6:thinking:medium",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.7:thinking",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-4.8:thinking",
      "anthropic/claude-opus-5",
      "anthropic/claude-opus-latest",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-4.6:thinking",
      "anthropic/claude-sonnet-5",
      "anthropic/claude-sonnet-5:thinking",
      "anthropic/claude-sonnet-latest",
      "arcee-ai/trinity-large-thinking",
      "asi1-mini",
      "auto-model",
      "auto-model-basic",
      "auto-model-premium",
      "auto-model-standard",
      "azure-gpt-4-turbo",
      "azure-gpt-4o",
      "azure-gpt-4o-mini",
      "azure-o1",
      "azure-o3-mini",
      "baseten/Kimi-K2-Instruct-FP4",
      "brave",
      "brave-pro",
      "brave-research",
      "bytedance-seed/seed-2-1-turbo",
      "bytedance-seed/seed-2.0-code",
      "bytedance-seed/seed-2.0-lite",
      "bytedance/doubao-seed-2.1-pro",
      "bytedance/doubao-seed-2.1-turbo",
      "bytedance/doubao-seed-character",
      "celeris-1",
      "chutesai/Mistral-Small-3.2-24B-Instruct-2506",
      "claude-haiku-4-5-20251001",
      "claude-haiku-4-5-20251001-thinking",
      "claude-opus-4-1-20250805",
      "claude-opus-4-1-thinking",
      "claude-opus-4-1-thinking:1024",
      "claude-opus-4-1-thinking:32768",
      "claude-opus-4-1-thinking:8192",
      "claude-opus-4-20250514",
      "claude-opus-4-5-20251101",
      "claude-opus-4-5-20251101:thinking",
      "claude-opus-4-thinking",
      "claude-opus-4-thinking:1024",
      "claude-opus-4-thinking:32768",
      "claude-opus-4-thinking:8192",
      "claude-sonnet-4-20250514",
      "claude-sonnet-4-5-20250929",
      "claude-sonnet-4-5-20250929-thinking",
      "claude-sonnet-4-thinking",
      "claude-sonnet-4-thinking:1024",
      "claude-sonnet-4-thinking:32768",
      "claude-sonnet-4-thinking:64000",
      "claude-sonnet-4-thinking:8192",
      "claw-high",
      "claw-low",
      "claw-medium",
      "cohere/command-r-plus-08-2024",
      "command-a-reasoning-08-2025",
      "crofai/greg-2-super",
      "crofai/greg-2-ultra",
      "deepclaude",
      "deepcogito/cogito-v1-preview-qwen-32B",
      "deepseek-ai/DeepSeek-R1-0528",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V3.1-Terminus",
      "deepseek-ai/DeepSeek-V3.1-Terminus:thinking",
      "deepseek-ai/DeepSeek-V3.1:thinking",
      "deepseek-ai/deepseek-v3.2-exp",
      "deepseek-ai/deepseek-v3.2-exp-thinking",
      "deepseek-chat",
      "deepseek-chat-cheaper",
      "deepseek-r1",
      "deepseek-r1-sambanova",
      "deepseek-reasoner",
      "deepseek-reasoner-cheaper",
      "deepseek-v3-0324",
      "deepseek/deepseek-latest",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2:thinking",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-0731:thinking",
      "deepseek/deepseek-v4-flash-latest",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-flash-vision-exp-uncensored",
      "deepseek/deepseek-v4-flash:thinking",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "deepseek/deepseek-v4-pro-0813:thinking",
      "deepseek/deepseek-v4-pro:thinking",
      "Doctor-Shotgun/MS3.2-24B-Magnum-Diamond",
      "doubao-1.5-pro-256k",
      "doubao-1.5-pro-32k",
      "doubao-1.5-vision-pro-32k",
      "doubao-seed-1-6-250615",
      "doubao-seed-1-6-flash-250615",
      "doubao-seed-2-0-code-preview-260215",
      "doubao-seed-2-0-lite-260215",
      "doubao-seed-2-0-mini-260215",
      "doubao-seed-2-0-pro-260215",
      "Envoid/Llama-3.05-Nemotron-Tenyxchat-Storybreaker-70B",
      "Envoid/Llama-3.05-NT-Storybreaker-Ministral-70B",
      "ernie-5.0-thinking-preview",
      "ernie-5.1",
      "ernie-5.1:thinking",
      "ernie-x1.1-preview",
      "EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0",
      "EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.1",
      "EVA-UNIT-01/EVA-Qwen2.5-32B-v0.2",
      "EVA-UNIT-01/EVA-Qwen2.5-72B-v0.2",
      "exa-answer",
      "failspy/Meta-Llama-3-70B-Instruct-abliterated-v3.5",
      "fastgpt",
      "featherless-ai/Qwerky-72B",
      "GalrionSoftworks/MN-LooseCannon-12B-v1",
      "gemini-2.0-pro-exp-02-05",
      "gemini-2.0-pro-reasoner",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-flash-lite-preview-06-17",
      "gemini-2.5-flash-lite-preview-09-2025",
      "gemini-2.5-flash-lite-preview-09-2025-thinking",
      "gemini-2.5-flash-nothinking",
      "gemini-2.5-flash-preview-04-17",
      "gemini-2.5-flash-preview-04-17:thinking",
      "gemini-2.5-flash-preview-05-20",
      "gemini-2.5-flash-preview-05-20:thinking",
      "gemini-2.5-flash-preview-09-2025",
      "gemini-2.5-flash-preview-09-2025-thinking",
      "gemini-2.5-pro",
      "gemini-2.5-pro-exp-03-25",
      "gemini-2.5-pro-preview-03-25",
      "gemini-2.5-pro-preview-05-06",
      "gemini-2.5-pro-preview-06-05",
      "gemini-3-pro-image-preview",
      "gemini-exp-1206",
      "gemma-4-12b-it",
      "gemma-4-26b-a4b-it-chimerax",
      "gemma-4-26b-a4b-it-darksoul",
      "gemma-4-26b-a4b-it-luminous",
      "gemma-4-26b-a4b-it-moonlight",
      "gemma-4-26b-a4b-it-musica",
      "gemma-4-26b-a4b-it-opusdistill",
      "gemma-4-26b-a4b-it-shadowsiren",
      "Gemma-4-26B-A4B-MeroMero",
      "Gemma-4-26B-A4B-MeroMero:thinking",
      "gemma-4-26b-a4b-uncensored",
      "gemma-4-26b-a4b-uncensored:thinking",
      "Gemma-4-31B-Claude-4.6-Opus-Reasoning-Distilled",
      "Gemma-4-31B-Cognitive-Unshackled",
      "Gemma-4-31B-DarkIdol",
      "Gemma-4-31B-GarnetV2",
      "gemma-4-31b-it-darkidol",
      "gemma-4-31b-it-fabled",
      "gemma-4-31b-it-garnet",
      "gemma-4-31b-it-gembrain",
      "gemma-4-31b-it-gemsicle",
      "gemma-4-31b-it-isometry",
      "gemma-4-31b-it-novelist",
      "Gemma-4-31B-MeroMero-v2",
      "Gemma-4-31B-MeroMero-v2:thinking",
      "Gemma-4-31B-Queen",
      "gemma-4-e2b-it",
      "gemma-4-e4b-it",
      "glm-4-air-0111",
      "glm-4-long",
      "glm-4-plus-0111",
      "glm-4.1v-thinking-flash",
      "glm-4.1v-thinking-flashx",
      "GLM-4.6-Derestricted-v5",
      "glm-z1-airx",
      "google/gemini-3-flash-preview",
      "google/gemini-3-flash-preview-thinking",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.1-pro-preview-high",
      "google/gemini-3.1-pro-preview-low",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.5-flash-thinking",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemini-flash-latest",
      "google/gemini-flash-lite-latest",
      "google/gemini-pro-latest",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-26b-a4b-it:thinking",
      "google/gemma-4-31b-it",
      "google/gemma-4-31b-it:thinking",
      "Gryphe/MythoMax-L2-13b",
      "hermes-high",
      "hermes-low",
      "hermes-medium",
      "holo3-35b-a3b",
      "holo3-35b-a3b:thinking",
      "huihui-ai/DeepSeek-R1-Distill-Llama-70B-abliterated",
      "huihui-ai/DeepSeek-R1-Distill-Qwen-32B-abliterated",
      "huihui-ai/Llama-3.3-70B-Instruct-abliterated",
      "huihui-ai/Qwen2.5-32B-Instruct-abliterated",
      "ibm-granite/granite-4.2-8b",
      "inception/mercury-2.5-preview",
      "inclusionai/ling-3.0-flash",
      "inclusionai/ling-3.0-flash:thinking",
      "inflatebot/MN-12B-Mag-Mell-R1",
      "kimi-k2-instruct-fast",
      "LatitudeGames/Wayfarer-Large-70B-Llama-3.3",
      "liquid/lfm-2.5-2.6b",
      "LLM360/K2-Think",
      "longcat-2.0",
      "longcat-2.0:thinking",
      "MarinaraSpaghetti/NemoMix-Unleashed-12B",
      "meganova-ai/manta-flash-1.0",
      "meganova-ai/manta-mini-1.0",
      "meganova-ai/manta-pro-1.0",
      "mercury-2",
      "mercury-coder-small",
      "Meta-Llama-3-1-8B-Instruct-FP8",
      "meta-llama/llama-3.1-8b-instruct",
      "meta-llama/llama-3.2-3b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "meta/muse-glimmer-30b",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "meta/muse-spark-1.2-contributor",
      "meta/muse-spark-1.3",
      "meta/muse-spark-1.3-contributor",
      "microsoft/wizardlm-2-8x22b",
      "MiniMax-M1",
      "MiniMax-M2",
      "minimax/minimax-01",
      "minimax/minimax-latest",
      "minimax/minimax-m2-her",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-turbo",
      "minimax/minimax-m3",
      "minimax/minimax-m3:thinking",
      "MiniMaxAI/MiniMax-M1-80k",
      "mistral-code-agent-latest",
      "mistral-code-latest",
      "mistral-small-31-24b-instruct",
      "mistral/mistral-medium-3.5",
      "mistral/mistral-medium-3.5:thinking",
      "mistralai/codestral-2508",
      "mistralai/devstral-2-123b-instruct-2512",
      "mistralai/Devstral-Small-2505",
      "mistralai/ministral-14b-2512",
      "mistralai/ministral-14b-instruct-2512",
      "mistralai/ministral-3b-2512",
      "mistralai/ministral-8b-2512",
      "mistralai/mistral-large",
      "mistralai/mistral-large-3-675b-instruct-2512",
      "mistralai/mistral-medium-3",
      "mistralai/mistral-medium-3.1",
      "mistralai/Mistral-Nemo-Instruct-2407",
      "mistralai/mistral-saba",
      "mistralai/mistral-small-4-119b-2603",
      "mistralai/mistral-small-4-119b-2603:thinking",
      "mistralai/mixtral-8x22b-instruct-v0.1",
      "mlabonne/NeuralDaredevil-8B-abliterated",
      "moonshotai/kimi-k2-instruct",
      "moonshotai/kimi-k2-instruct-0711",
      "moonshotai/Kimi-K2-Instruct-0905",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.5:thinking",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.6:thinking",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k2.7-code-highspeed",
      "moonshotai/kimi-k3",
      "moonshotai/kimi-latest",
      "nano-gpt-help",
      "nanogpt/coding-router",
      "nanogpt/coding-router:high",
      "nanogpt/coding-router:low",
      "nanogpt/coding-router:max",
      "nanogpt/coding-router:medium",
      "NeverSleep/Lumimaid-v0.2-70B",
      "nex-agi/nex-n2-mini",
      "nex-agi/nex-n2-pro",
      "nothingiisreal/L3.1-70B-Celeste-V0.1-BF16",
      "NousResearch/hermes-3-llama-3.1-70b",
      "NousResearch/hermes-4-405b",
      "NousResearch/hermes-4-405b:thinking",
      "nvidia/Llama-3.1-Nemotron-70B-Instruct-HF",
      "nvidia/Llama-3.3-Nemotron-Super-49B-v1",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-3-super-120b-a12b:thinking",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3-ultra-550b-a55b:thinking",
      "nvidia/nemotron-3.5-lightning",
      "nvidia/nemotron-3.5-lightning:thinking",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-2025-11-13",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.5",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-luna-pro",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-sol-pro",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-terra-pro",
      "openai/gpt-6-astra",
      "openai/gpt-6-astra-pro",
      "openai/gpt-chat-latest",
      "openai/gpt-latest",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-20b",
      "openai/o1",
      "openai/o1-pro",
      "openai/o3",
      "openai/o3-mini",
      "openai/o3-mini-high",
      "openai/o3-mini-low",
      "openai/o3-pro-2025-06-10",
      "openai/o4-mini",
      "openai/o4-mini-high",
      "ornith-ai/ornith-1.5-35b-a3b",
      "ornith-ai/ornith-1.5-35b-a3b:thinking",
      "ornith-ai/ornith-1.5-9b",
      "ornith-ai/ornith-1.5-9b:thinking",
      "pamanseau/OpenReasoning-Nemotron-32B",
      "perceptron/perceptron-mk1",
      "perplexity-academic-researcher",
      "phi-4-mini-instruct",
      "phi-4-multimodal-instruct",
      "pokee-isaac",
      "poolside/laguna-s-2.1",
      "poolside/laguna-s-2.1:thinking",
      "qvq-max",
      "qwen-3.6-plus",
      "qwen-long",
      "qwen-max",
      "qwen-plus",
      "qwen-turbo",
      "qwen/qwen-2.5-72b-instruct",
      "qwen/Qwen2.5-Coder-32B-Instruct",
      "qwen/qwen3-14b",
      "qwen/qwen3-235b-a22b",
      "qwen/Qwen3-235B-A22B-Instruct-2507",
      "qwen/Qwen3-235B-A22B-Thinking-2507",
      "qwen/qwen3-30b-a3b",
      "qwen/qwen3-32b",
      "qwen/Qwen3-8B",
      "qwen/qwen3-coder",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/Qwen3-Next-80B-A3B-Instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/Qwen3-VL-235B-A22B-Instruct",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-397b-a17b-thinking",
      "qwen/qwen3.5-9b",
      "qwen/qwen3.5-plus",
      "qwen/qwen3.5-plus-thinking",
      "qwen/Qwen3.6-35B-A3B",
      "qwen/qwen3.6-35b-a3b-uncensored",
      "qwen/qwen3.6-35b-a3b-uncensored:thinking",
      "qwen/Qwen3.6-35B-A3B:thinking",
      "qwen/qwen3.8-2.4t-a95b",
      "qwen/qwen3.8-27b-fable",
      "qwen/qwen3.8-27b-obliterated",
      "qwen/qwen3.8-27b-obliterated:thinking",
      "qwen/qwen3.8-27b-uncensored",
      "qwen/qwen3.8-27b-uncensored:thinking",
      "qwen25-vl-72b-instruct",
      "qwen3-30b-a3b-instruct-2507",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-max-2026-01-23",
      "qwen3-vl-235b-a22b-instruct-original",
      "qwen3-vl-235b-a22b-thinking",
      "qwen3.5-0.8b",
      "qwen3.5-122b-a10b",
      "qwen3.5-122b-a10b:thinking",
      "qwen3.5-27b",
      "Qwen3.5-27B-BlueStar-v3-Derestricted",
      "Qwen3.5-27B-Queen-Derestricted",
      "qwen3.5-27b:thinking",
      "qwen3.5-2b",
      "qwen3.5-35b-a3b",
      "qwen3.5-35b-a3b:thinking",
      "qwen3.5-4b",
      "qwen3.5-flash",
      "qwen3.5-flash:thinking",
      "qwen3.5-omni-flash",
      "qwen3.5-omni-plus",
      "qwen3.6-max-preview",
      "qwen3.7-flash",
      "qwen3.7-flash:thinking",
      "qwen3.7-max",
      "qwen3.7-max:thinking",
      "qwen3.7-plus",
      "qwen3.7-plus:thinking",
      "qwen3.8-27b",
      "qwen3.8-27b:thinking",
      "qwen3.8-max",
      "qwen3.8-max:thinking",
      "ReadyArt/MS3.2-The-Omega-Directive-24B-Unslop-v2.0",
      "sakana/fugu-ultra",
      "sakana/fugu-ultra-v1.1",
      "Salesforce/Llama-xLAM-2-70b-fc-r",
      "Sao10K/L3-8B-Stheno-v3.2",
      "Sao10K/L3.1-70B-Euryale-v2.2",
      "Sao10K/L3.1-70B-Hanami-x1",
      "Sao10K/L3.3-70B-Euryale-v2.3",
      "sarvam-105b",
      "shisa-ai/shisa-v2-llama3.3-70b",
      "shisa-ai/shisa-v2.1-llama3.3-70b",
      "sonar",
      "sonar-deep-research",
      "sonar-pro",
      "sonar-reasoning-pro",
      "soob3123/amoral-gemma3-27B-v2",
      "soob3123/GrayLine-Qwen3-8B",
      "soob3123/Veiled-Calla-12B",
      "Steelskull/L3.3-Cu-Mai-R1-70b",
      "Steelskull/L3.3-Electra-R1-70b",
      "Steelskull/L3.3-MS-Nevoria-70b",
      "Steelskull/L3.3-Nevoria-R1-70b",
      "stepfun-ai/step-3.5-flash",
      "stepfun-ai/step-3.5-flash-2603",
      "stepfun/step-3.7-flash:thinking",
      "TEE/deepseek-v3.2",
      "TEE/deepseek-v4-flash",
      "TEE/gemma-4-26b-a4b-uncensored",
      "TEE/gemma-4-31b-it",
      "TEE/gemma4-31b",
      "TEE/gemma4-31b:thinking",
      "TEE/glm-5.1",
      "TEE/glm-5.1-thinking",
      "TEE/glm-5.2",
      "TEE/glm-5.2:thinking",
      "TEE/glm-5.3",
      "TEE/glm-5.3-flash",
      "TEE/gpt-oss-120b",
      "TEE/gpt-oss-20b",
      "TEE/kimi-k2.6",
      "TEE/kimi-k2.7-code",
      "TEE/kimi-k3",
      "TEE/llama3-3-70b",
      "TEE/muse-glimmer-30b",
      "TEE/qwen2.5-vl-72b-instruct",
      "TEE/qwen3.5-27b",
      "TEE/qwen3.5-397b-a17b",
      "TEE/qwen3.6-27b",
      "TEE/qwen3.6-35b-a3b",
      "TEE/qwen3.6-35b-a3b-uncensored",
      "TEE/qwen3.8-27b",
      "tencent/hy3",
      "tencent/hy4-preview",
      "TheDrummer/Anubis-70B-v1",
      "TheDrummer/Anubis-70B-v1.1",
      "TheDrummer/Artemis-v1.1",
      "TheDrummer/Cydonia-24B-v2",
      "TheDrummer/Cydonia-24B-v4",
      "TheDrummer/Cydonia-24B-v4.1",
      "TheDrummer/Cydonia-24B-v4.3",
      "TheDrummer/Magidonia-24B-v4.3",
      "TheDrummer/Rocinante-12B-v1.1",
      "TheDrummer/skyfall-36b-v2",
      "TheDrummer/UnslopNemo-12B-v4.1",
      "thinkingmachines/inkling",
      "thinkingmachines/Inkling-Small",
      "thinkingmachines/Inkling-Small:thinking",
      "thinkingmachines/inkling:thinking",
      "THUDM/GLM-4-32B-0414",
      "THUDM/GLM-4-9B-0414",
      "THUDM/GLM-Z1-9B-0414",
      "undi95/remm-slerp-l2-13b",
      "universal-summarizer",
      "unsloth/gemma-3-12b-it",
      "unsloth/gemma-3-27b-it",
      "unsloth/gemma-3-4b-it",
      "upstage/solar-pro-3",
      "upstage/solar-pro4",
      "upstage/solar-pro4:thinking",
      "venice-uncensored",
      "VongolaChouko/Starcannon-Unleashed-12B-v1.0",
      "x-ai/grok-4.20",
      "x-ai/grok-4.20-multi-agent",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-4.6",
      "x-ai/grok-build-0.1",
      "x-ai/grok-latest",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "xiaomi/mimo-v2.5-pro-crof",
      "xiaomi/mimo-v2.5-pro-crof:thinking",
      "xiaomi/mimo-v2.5-pro:thinking",
      "xiaomi/mimo-v2.5:thinking",
      "yi-large",
      "yi-medium-200k",
      "z-ai/glm-4.5",
      "z-ai/GLM-4.5-Air",
      "z-ai/GLM-4.5-Air:thinking",
      "z-ai/GLM-4.5:thinking",
      "z-ai/glm-4.5v",
      "z-ai/glm-4.5v:thinking",
      "z-ai/glm-4.6",
      "z-ai/glm-4.6-original",
      "z-ai/GLM-4.6-turbo",
      "z-ai/GLM-4.6-turbo:thinking",
      "z-ai/glm-4.6:thinking",
      "z-ai/glm-4.6v",
      "z-ai/glm-4.6v-original",
      "z-ai/glm-4.7",
      "z-ai/glm-4.7-flash",
      "z-ai/glm-4.7-flash-original",
      "z-ai/glm-4.7-flash-original:thinking",
      "z-ai/glm-4.7-flash:thinking",
      "z-ai/glm-4.7-original",
      "z-ai/glm-4.7-original:thinking",
      "z-ai/glm-4.7:thinking",
      "z-ai/glm-5",
      "z-ai/glm-5-original",
      "z-ai/glm-5-original:thinking",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5:thinking",
      "z-ai/glm-5.1",
      "z-ai/glm-5.1:thinking",
      "z-ai/glm-5.2",
      "z-ai/glm-5.2:thinking",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash",
      "z-ai/glm-5.3-flash-uncensored",
      "z-ai/glm-5.3:thinking",
      "z-ai/glm-5v-turbo",
      "z-ai/glm-5v-turbo:thinking",
      "z-ai/glm-latest"
    ]
  },
  {
    id: "nearai",
    name: "NEAR AI Cloud",
    apiKeyEnvVars: ["NEARAI_API_KEY"],
    models: [
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-6",
      "black-forest-labs/FLUX.2-klein-4B",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-pro",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.5-flash",
      "google/gemma-4-31B-it",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.1",
      "openai/gpt-5.2",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.5",
      "openai/gpt-oss-120b",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "openai/whisper-large-v3",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3-Embedding-0.6B",
      "Qwen/Qwen3-Reranker-0.6B",
      "Qwen/Qwen3-VL-30B-A3B-Instruct",
      "Qwen/Qwen3.5-122B-A10B",
      "Qwen/Qwen3.6-35B-A3B-FP8",
      "zai-org/GLM-5.1-FP8"
    ]
  },
  {
    id: "nebius",
    name: "Nebius Token Factory",
    apiKeyEnvVars: ["NEBIUS_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Pro",
      "google/gemma-3-27b-it",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "NousResearch/Hermes-4-405B",
      "nvidia/Nemotron-3_5-Lightning",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/Nemotron-3-Ultra-550b-a55b",
      "openai/gpt-oss-120b",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3-Embedding-8B",
      "Qwen/Qwen3.5-397B-A17B",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "neon",
    name: "Neon",
    apiKeyEnvVars: ["NEON_AI_GATEWAY_TOKEN"],
    models: [
      "claude-fable-5",
      "claude-fable-5-1",
      "claude-haiku-4-5",
      "claude-opus-4-1",
      "claude-opus-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "gemini-3-1-flash-lite",
      "gemini-3-1-pro",
      "gemini-3-5-flash",
      "gemini-3-5-flash-lite",
      "gemini-3-6-flash",
      "gemini-3-flash",
      "gemma-3-12b",
      "glm-5-2",
      "glm-5-3-flash",
      "gpt-5",
      "gpt-5-1",
      "gpt-5-2",
      "gpt-5-3-codex",
      "gpt-5-4",
      "gpt-5-4-mini",
      "gpt-5-4-nano",
      "gpt-5-5",
      "gpt-5-5-pro",
      "gpt-5-6-luna",
      "gpt-5-6-sol",
      "gpt-5-6-terra",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-6-astra",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "grok-4-6",
      "inkling",
      "kimi-k3",
      "llama-4-maverick",
      "meta-llama-3-1-8b-instruct",
      "meta-llama-3-3-70b-instruct",
      "qwen3-next-80b-a3b-instruct",
      "qwen35-122b-a10b"
    ]
  },
  {
    id: "neosmith",
    name: "NeoSmith",
    apiKeyEnvVars: ["NEOSMITH_API_KEY"],
    models: [
      "neosmith.intelligent-basic",
      "neosmith.intelligent-maestro",
      "neosmith.intelligent-pro",
      "neosmith.neolite"
    ]
  },
  {
    id: "netlify",
    name: "Netlify",
    apiKeyEnvVars: ["NETLIFY_TOKEN", "NETLIFY_SITE_ID"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5-1",
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-haiku-4-5-20251001",
      "anthropic/claude-opus-4-5",
      "anthropic/claude-opus-4-5-20251101",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-5-20250929",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "gemini/gemini-2.5-flash",
      "gemini/gemini-2.5-flash-image",
      "gemini/gemini-2.5-flash-lite",
      "gemini/gemini-2.5-pro",
      "gemini/gemini-3-flash-preview",
      "gemini/gemini-3-pro-image",
      "gemini/gemini-3.1-flash-image",
      "gemini/gemini-3.1-flash-lite",
      "gemini/gemini-3.1-flash-lite-image",
      "gemini/gemini-3.1-pro-preview",
      "gemini/gemini-3.1-pro-preview-customtools",
      "gemini/gemini-3.5-flash",
      "gemini/gemini-3.5-flash-lite",
      "gemini/gemini-3.6-flash",
      "gemini/gemini-3.7-flash",
      "gemini/gemini-3.8-flash",
      "gemini/gemini-flash-latest",
      "gemini/gemini-flash-lite-latest",
      "openai/chat-latest",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-2025-08-07",
      "openai/gpt-5-mini",
      "openai/gpt-5-mini-2025-08-07",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-2025-11-13",
      "openai/gpt-5.2",
      "openai/gpt-5.2-2025-12-11",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.2-pro-2025-12-11",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-2026-03-05",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-mini-2026-03-17",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-nano-2026-03-17",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.4-pro-2026-03-05",
      "openai/gpt-5.5",
      "openai/gpt-5.5-2026-04-23",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.5-pro-2026-04-23",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "openai/o3",
      "openai/o3-mini",
      "openai/o4-mini",
      "openrouter/~deepseek/deepseek-v4-flash-latest",
      "openrouter/~moonshotai/kimi-latest",
      "openrouter/~x-ai/grok-latest",
      "openrouter/~z-ai/glm-flash-latest",
      "openrouter/~z-ai/glm-latest",
      "openrouter/anthracite-org/magnum-v4-72b",
      "openrouter/baidu/ernie-4.5-vl-424b-a47b",
      "openrouter/bytedance-seed/seed-1.6",
      "openrouter/bytedance-seed/seed-1.6-flash",
      "openrouter/bytedance-seed/seed-2-1-turbo",
      "openrouter/bytedance-seed/seed-2.0-code",
      "openrouter/bytedance-seed/seed-2.0-lite",
      "openrouter/bytedance-seed/seed-2.0-mini",
      "openrouter/bytedance/ui-tars-1.5-7b",
      "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition",
      "openrouter/deepseek/deepseek-chat",
      "openrouter/deepseek/deepseek-chat-v3-0324",
      "openrouter/deepseek/deepseek-chat-v3.1",
      "openrouter/deepseek/deepseek-r1",
      "openrouter/deepseek/deepseek-r1-0528",
      "openrouter/deepseek/deepseek-r1-distill-llama-70b",
      "openrouter/deepseek/deepseek-v3.1-terminus",
      "openrouter/deepseek/deepseek-v3.2",
      "openrouter/deepseek/deepseek-v3.2-exp",
      "openrouter/deepseek/deepseek-v4-flash",
      "openrouter/deepseek/deepseek-v4-flash-0731",
      "openrouter/deepseek/deepseek-v4-flash-vision-exp",
      "openrouter/deepseek/deepseek-v4-pro",
      "openrouter/deepseek/deepseek-v4-pro-0813",
      "openrouter/google/gemma-2-27b-it",
      "openrouter/google/gemma-3-12b-it",
      "openrouter/google/gemma-3-27b-it",
      "openrouter/google/gemma-3-4b-it",
      "openrouter/google/gemma-4-26b-a4b-it",
      "openrouter/google/gemma-4-31b-it",
      "openrouter/gryphe/mythomax-l2-13b",
      "openrouter/ibm-granite/granite-4.2-8b",
      "openrouter/inception/mercury-2",
      "openrouter/inception/mercury-2.5-preview",
      "openrouter/inclusionai/ling-3.0-flash",
      "openrouter/inclusionai/ling-3.0-flash-fin",
      "openrouter/inclusionai/ling-3.0-flash-fin:free",
      "openrouter/inclusionai/ling-3.0-flash-sante:free",
      "openrouter/mancer/weaver",
      "openrouter/meta-llama/llama-3.1-70b-instruct",
      "openrouter/meta-llama/llama-3.1-8b-instruct",
      "openrouter/meta-llama/llama-3.2-3b-instruct",
      "openrouter/meta-llama/llama-3.3-70b-instruct",
      "openrouter/meta-llama/llama-4-maverick",
      "openrouter/meta-llama/llama-4-scout",
      "openrouter/meta-llama/llama-guard-4-12b",
      "openrouter/meta/muse-glimmer-30b",
      "openrouter/microsoft/phi-4",
      "openrouter/microsoft/wizardlm-2-8x22b",
      "openrouter/minimax/minimax-m1",
      "openrouter/minimax/minimax-m2",
      "openrouter/minimax/minimax-m2.1",
      "openrouter/minimax/minimax-m2.5",
      "openrouter/minimax/minimax-m2.7",
      "openrouter/minimax/minimax-m3",
      "openrouter/mistralai/devstral-2512",
      "openrouter/mistralai/ministral-14b-2512",
      "openrouter/mistralai/ministral-3b-2512",
      "openrouter/mistralai/ministral-8b-2512",
      "openrouter/mistralai/mistral-large-2407",
      "openrouter/mistralai/mistral-large-2512",
      "openrouter/mistralai/mistral-medium-3",
      "openrouter/mistralai/mistral-medium-3-5",
      "openrouter/mistralai/mistral-medium-3.1",
      "openrouter/mistralai/mistral-nemo",
      "openrouter/mistralai/mistral-saba",
      "openrouter/mistralai/mistral-small-24b-instruct-2501",
      "openrouter/mistralai/mistral-small-2603",
      "openrouter/mistralai/mistral-small-3.2-24b-instruct",
      "openrouter/mistralai/mixtral-8x22b-instruct",
      "openrouter/mistralai/voxtral-small-24b-2507",
      "openrouter/moonshotai/kimi-k2",
      "openrouter/moonshotai/kimi-k2-0905",
      "openrouter/moonshotai/kimi-k2-thinking",
      "openrouter/moonshotai/kimi-k2.5",
      "openrouter/moonshotai/kimi-k2.6",
      "openrouter/moonshotai/kimi-k2.7-code",
      "openrouter/moonshotai/kimi-k3",
      "openrouter/morph/morph-v3-fast",
      "openrouter/morph/morph-v3-large",
      "openrouter/nousresearch/hermes-3-llama-3.1-405b",
      "openrouter/nousresearch/hermes-3-llama-3.1-70b",
      "openrouter/nousresearch/hermes-4-405b",
      "openrouter/nousresearch/hermes-4-70b",
      "openrouter/nvidia/nemotron-3-nano-30b-a3b",
      "openrouter/nvidia/nemotron-3-super-120b-a12b",
      "openrouter/nvidia/nemotron-3-ultra-550b-a55b",
      "openrouter/nvidia/nemotron-3.5-content-safety",
      "openrouter/nvidia/nemotron-3.5-lightning",
      "openrouter/openai/gpt-oss-120b",
      "openrouter/openai/gpt-oss-20b",
      "openrouter/openai/gpt-oss-safeguard-20b",
      "openrouter/openrouter/auto",
      "openrouter/openrouter/auto-beta",
      "openrouter/openrouter/free",
      "openrouter/openrouter/pareto-code",
      "openrouter/perceptron/perceptron-mk1",
      "openrouter/perplexity/sonar",
      "openrouter/perplexity/sonar-deep-research",
      "openrouter/perplexity/sonar-pro",
      "openrouter/perplexity/sonar-pro-search",
      "openrouter/perplexity/sonar-reasoning-pro",
      "openrouter/qwen/qwen-2.5-72b-instruct",
      "openrouter/qwen/qwen-2.5-7b-instruct",
      "openrouter/qwen/qwen2.5-vl-72b-instruct",
      "openrouter/qwen/qwen3-14b",
      "openrouter/qwen/qwen3-235b-a22b-2507",
      "openrouter/qwen/qwen3-235b-a22b-thinking-2507",
      "openrouter/qwen/qwen3-30b-a3b",
      "openrouter/qwen/qwen3-30b-a3b-instruct-2507",
      "openrouter/qwen/qwen3-32b",
      "openrouter/qwen/qwen3-coder",
      "openrouter/qwen/qwen3-coder-30b-a3b-instruct",
      "openrouter/qwen/qwen3-coder-next",
      "openrouter/qwen/qwen3-next-80b-a3b-instruct",
      "openrouter/qwen/qwen3-vl-235b-a22b-instruct",
      "openrouter/qwen/qwen3-vl-235b-a22b-thinking",
      "openrouter/qwen/qwen3-vl-30b-a3b-instruct",
      "openrouter/qwen/qwen3-vl-8b-instruct",
      "openrouter/qwen/qwen3.5-122b-a10b",
      "openrouter/qwen/qwen3.5-27b",
      "openrouter/qwen/qwen3.5-35b-a3b",
      "openrouter/qwen/qwen3.5-397b-a17b",
      "openrouter/qwen/qwen3.5-9b",
      "openrouter/qwen/qwen3.6-27b",
      "openrouter/qwen/qwen3.6-35b-a3b",
      "openrouter/qwen/qwen3.8-2.4t-a95b",
      "openrouter/qwen/qwen3.8-27b",
      "openrouter/rekaai/reka-edge",
      "openrouter/rekaai/reka-flash-3",
      "openrouter/relace/relace-apply-3",
      "openrouter/relace/relace-search",
      "openrouter/sao10k/l3-lunaris-8b",
      "openrouter/sao10k/l3.1-euryale-70b",
      "openrouter/sao10k/l3.3-euryale-70b",
      "openrouter/stepfun/step-3.7-flash",
      "openrouter/tencent/hy-mt2-1.8b",
      "openrouter/tencent/hy-mt2-30b-a3b",
      "openrouter/tencent/hy-mt2-7b",
      "openrouter/tencent/hy3",
      "openrouter/tencent/hy4-preview",
      "openrouter/thedrummer/cydonia-24b-v4.1",
      "openrouter/thedrummer/skyfall-36b-v2",
      "openrouter/thedrummer/unslopnemo-12b",
      "openrouter/thinkingmachines/inkling",
      "openrouter/thinkingmachines/inkling-small",
      "openrouter/undi95/remm-slerp-l2-13b",
      "openrouter/upstage/solar-pro4",
      "openrouter/x-ai/grok-4.20",
      "openrouter/x-ai/grok-4.20-multi-agent",
      "openrouter/x-ai/grok-4.3",
      "openrouter/x-ai/grok-4.5",
      "openrouter/x-ai/grok-4.6",
      "openrouter/x-ai/grok-build-0.1",
      "openrouter/xiaomi/mimo-v2.5",
      "openrouter/xiaomi/mimo-v2.5-pro",
      "openrouter/z-ai/glm-4.5-air",
      "openrouter/z-ai/glm-4.5v",
      "openrouter/z-ai/glm-4.6",
      "openrouter/z-ai/glm-4.6v",
      "openrouter/z-ai/glm-4.7",
      "openrouter/z-ai/glm-4.7-flash",
      "openrouter/z-ai/glm-5",
      "openrouter/z-ai/glm-5.1",
      "openrouter/z-ai/glm-5.2",
      "openrouter/z-ai/glm-5.3",
      "openrouter/z-ai/glm-5.3-flash"
    ]
  },
  {
    id: "neuralwatt",
    name: "Neuralwatt",
    apiKeyEnvVars: ["NEURALWATT_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash-flex",
      "deepseek-v4-pro",
      "gemma-4-31b",
      "glm-5.2",
      "glm-5.2-fast",
      "glm-5.2-flex",
      "glm-5.2-short",
      "glm-5.2-short-fast",
      "glm-5.2-short-fast-flex",
      "glm-5.2-short-flex",
      "glm-5.3",
      "kimi-k2.7-code",
      "kimi-k2.7-code-fast",
      "kimi-k2.7-code-flex",
      "kimi-k3",
      "kimi-k3-fast",
      "kimi-k3-flex",
      "qwen-3.8-27b",
      "qwen3.6-35b",
      "qwen3.6-35b-fast"
    ]
  },
  {
    id: "nova",
    name: "Nova",
    apiKeyEnvVars: ["NOVA_API_KEY"],
    models: ["nova-2-lite-v1", "nova-2-pro-v1"]
  },
  {
    id: "novita-ai",
    name: "NovitaAI",
    apiKeyEnvVars: ["NOVITA_API_KEY"],
    models: [
      "baichuan/baichuan-m2-32b",
      "baidu/ernie-4.5-21B-a3b",
      "baidu/ernie-4.5-21B-a3b-thinking",
      "baidu/ernie-4.5-300b-a47b-paddle",
      "baidu/ernie-4.5-vl-28b-a3b",
      "baidu/ernie-4.5-vl-28b-a3b-thinking",
      "baidu/ernie-4.5-vl-424b-a47b",
      "deepseek/deepseek-ocr",
      "deepseek/deepseek-ocr-2",
      "deepseek/deepseek-prover-v2-671b",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-r1-0528-qwen3-8b",
      "deepseek/deepseek-r1-distill-llama-70b",
      "deepseek/deepseek-r1-distill-qwen-14b",
      "deepseek/deepseek-r1-distill-qwen-32b",
      "deepseek/deepseek-r1-turbo",
      "deepseek/deepseek-v3-0324",
      "deepseek/deepseek-v3-turbo",
      "deepseek/deepseek-v3.1",
      "deepseek/deepseek-v3.1-terminus",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-exp",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "google/gemma-3-12b-it",
      "google/gemma-3-27b-it",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-31b-it",
      "gryphe/mythomax-l2-13b",
      "inclusionai/ling-2.6-1t",
      "inclusionai/ling-2.6-flash",
      "inclusionai/ring-2.6-1t",
      "kwaipilot/kat-coder-pro",
      "meta-llama/llama-3-70b-instruct",
      "meta-llama/llama-3-8b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "meta-llama/llama-3.2-3b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-4-maverick-17b-128e-instruct-fp8",
      "meta-llama/llama-4-scout-17b-16e-instruct",
      "microsoft/wizardlm-2-8x22b",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimaxai/minimax-m1-80k",
      "mistralai/mistral-nemo",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-instruct",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k3",
      "nousresearch/hermes-2-pro-llama-3-8b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "paddlepaddle/paddleocr-vl",
      "qwen/qwen-2.5-72b-instruct",
      "qwen/qwen-mt-plus",
      "qwen/qwen2.5-7b-instruct",
      "qwen/qwen2.5-vl-72b-instruct",
      "qwen/qwen3-235b-a22b-fp8",
      "qwen/qwen3-235b-a22b-instruct-2507",
      "qwen/qwen3-235b-a22b-thinking-2507",
      "qwen/qwen3-30b-a3b-fp8",
      "qwen/qwen3-32b-fp8",
      "qwen/qwen3-4b-fp8",
      "qwen/qwen3-8b-fp8",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-coder-480b-a35b-instruct",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-max",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/qwen3-omni-30b-a3b-instruct",
      "qwen/qwen3-omni-30b-a3b-thinking",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3-vl-30b-a3b-instruct",
      "qwen/qwen3-vl-30b-a3b-thinking",
      "qwen/qwen3-vl-8b-instruct",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.7-max",
      "sao10K/l3-70b-euryale-v2.1",
      "sao10K/l3-8b-lunaris",
      "sao10K/L3-8B-stheno-v3.2",
      "sao10K/l31-70b-euryale-v2.2",
      "xiaomimimo/mimo-v2-flash",
      "xiaomimimo/mimo-v2-pro",
      "xiaomimimo/mimo-v2.5-pro",
      "zai-org/autoglm-phone-9b-multilingual",
      "zai-org/glm-4.5",
      "zai-org/glm-4.5-air",
      "zai-org/glm-4.5v",
      "zai-org/glm-4.6",
      "zai-org/glm-4.6v",
      "zai-org/glm-4.7",
      "zai-org/glm-4.7-flash",
      "zai-org/glm-5",
      "zai-org/glm-5.1",
      "zai-org/glm-5.2"
    ]
  },
  {
    id: "nvidia",
    name: "Nvidia",
    apiKeyEnvVars: ["NVIDIA_API_KEY"],
    models: [
      "abacusai/dracarys-llama-3.1-70b-instruct",
      "baai/bge-m3",
      "black-forest-labs/flux_1-kontext-dev",
      "black-forest-labs/flux_1-schnell",
      "black-forest-labs/flux_2-klein-4b",
      "black-forest-labs/flux.1-dev",
      "bytedance/seed-oss-36b-instruct",
      "deepseek-ai/deepseek-v4-flash",
      "deepseek-ai/deepseek-v4-flash-0731",
      "deepseek-ai/deepseek-v4-pro",
      "deepseek-ai/deepseek-v4-pro-0813",
      "google/gemma-2-2b-it",
      "google/gemma-3-12b-it",
      "google/gemma-3-4b-it",
      "google/gemma-3n-e2b-it",
      "google/gemma-3n-e4b-it",
      "google/gemma-4-31b-it",
      "google/google-paligemma",
      "meta/esm2-650m",
      "meta/esmfold",
      "meta/llama-3.1-70b-instruct",
      "meta/llama-3.1-8b-instruct",
      "meta/llama-3.2-11b-vision-instruct",
      "meta/llama-3.2-1b-instruct",
      "meta/llama-3.2-3b-instruct",
      "meta/llama-3.2-90b-vision-instruct",
      "meta/llama-3.3-70b-instruct",
      "meta/llama-4-maverick-17b-128e-instruct",
      "meta/llama-guard-4-12b",
      "meta/muse-glimmer-30b",
      "microsoft/phi-4-mini-instruct",
      "microsoft/phi-4-multimodal-instruct",
      "minimaxai/minimax-m2.7",
      "minimaxai/minimax-m3",
      "mistralai/magistral-small-2506",
      "mistralai/ministral-14b-instruct-2512",
      "mistralai/mistral-7b-instruct-v0.3",
      "mistralai/mistral-large-3-675b-instruct-2512",
      "mistralai/mistral-medium-3-instruct",
      "mistralai/mistral-medium-3.5-128b",
      "mistralai/mistral-nemotron",
      "mistralai/mistral-small-4-119b-2603",
      "mistralai/mixtral-8x22b-instruct",
      "mistralai/mixtral-8x7b-instruct",
      "moonshotai/kimi-k2-instruct-0905",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k3",
      "nvidia/active-speaker-detection",
      "nvidia/bevformer",
      "nvidia/cosmos-predict1-5b",
      "nvidia/cosmos-reason2-8b",
      "nvidia/cosmos-transfer1-7b",
      "nvidia/cosmos-transfer2_5-2b",
      "nvidia/gliner-pii",
      "nvidia/llama-3_2-nemoretriever-300m-embed-v1",
      "nvidia/llama-3.1-nemotron-70b-instruct",
      "nvidia/llama-3.1-nemotron-nano-8b-v1",
      "nvidia/llama-3.1-nemotron-nano-vl-8b-v1",
      "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
      "nvidia/llama-3.1-nemotron-ultra-253b-v1",
      "nvidia/llama-3.3-nemotron-super-49b-v1",
      "nvidia/llama-3.3-nemotron-super-49b-v1.5",
      "nvidia/llama-nemotron-embed-vl-1b-v2",
      "nvidia/llama-nemotron-rerank-vl-1b-v2",
      "nvidia/magpie-tts-zeroshot",
      "nvidia/nemotron-3-content-safety",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3.5-lightning-30b-a3b",
      "nvidia/nemotron-content-safety-reasoning-4b",
      "nvidia/nemotron-mini-4b-instruct",
      "nvidia/nemotron-nano-12b-v2-vl",
      "nvidia/nemotron-voicechat",
      "nvidia/nv-embed-v1",
      "nvidia/nv-embedcode-7b-v1",
      "nvidia/nvidia-nemotron-nano-9b-v2",
      "nvidia/rerank-qa-mistral-4b",
      "nvidia/riva-translate-4b-instruct-v1.1",
      "nvidia/sparsedrive",
      "nvidia/streampetr",
      "nvidia/studiovoice",
      "nvidia/synthetic-video-detector",
      "nvidia/usdcode",
      "nvidia/usdvalidate",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/whisper-large-v3",
      "poolside/laguna-xs-2.1",
      "qwen/qwen-image",
      "qwen/qwen-image-edit",
      "qwen/qwen2.5-coder-32b-instruct",
      "qwen/qwen3-coder-480b-a35b-instruct",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-397b-a17b",
      "sarvamai/sarvam-m",
      "stepfun-ai/step-3.5-flash",
      "stepfun-ai/step-3.7-flash",
      "thinkingmachines/inkling",
      "upstage/solar-10.7b-instruct",
      "z-ai/glm-5.2"
    ]
  },
  {
    id: "ofox",
    name: "Ofox",
    apiKeyEnvVars: ["OFOX_API_KEY"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "bailian/qwen-flash",
      "bailian/qwen-max",
      "bailian/qwen-plus",
      "bailian/qwen-turbo",
      "bailian/qwen-vl-max",
      "bailian/qwen3-coder-flash",
      "bailian/qwen3-coder-next",
      "bailian/qwen3-coder-plus",
      "bailian/qwen3-max",
      "bailian/qwen3.5-122b-a10b",
      "bailian/qwen3.5-27b",
      "bailian/qwen3.5-35b-a3b",
      "bailian/qwen3.5-397b-a17b",
      "bailian/qwen3.5-flash",
      "bailian/qwen3.5-plus",
      "bailian/qwen3.6-27b",
      "bailian/qwen3.6-flash",
      "bailian/qwen3.6-max-preview",
      "bailian/qwen3.6-plus",
      "bailian/qwen3.7-max",
      "bailian/qwen3.7-plus",
      "bailian/qwen3.8-27b",
      "bailian/qwen3.8-max",
      "bailian/qwen3.8-max-0902",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0423",
      "deepseek/deepseek-v4-pro-0813",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "minimax/m2-her",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.1-lightning",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-lightning",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k2.7-code-highspeed",
      "moonshotai/kimi-k3",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4o",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5.1",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-6-astra",
      "volcengine/doubao-seed-1-6",
      "volcengine/doubao-seed-1-6-flash",
      "volcengine/doubao-seed-1-6-vision",
      "volcengine/doubao-seed-1-8",
      "volcengine/doubao-seed-2.0-code",
      "volcengine/doubao-seed-2.0-lite",
      "volcengine/doubao-seed-2.0-mini",
      "volcengine/doubao-seed-2.0-pro",
      "volcengine/doubao-seed-2.1-pro",
      "volcengine/doubao-seed-2.1-turbo",
      "volcengine/doubao-seed-character",
      "volcengine/doubao-seed-evolving",
      "x-ai/grok-4.1-fast",
      "x-ai/grok-4.20",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-4.6",
      "z-ai/glm-4.6",
      "z-ai/glm-4.7",
      "z-ai/glm-4.7-flashx",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash",
      "z-ai/glm-5v-turbo"
    ]
  },
  {
    id: "ollama-cloud",
    name: "Ollama Cloud",
    apiKeyEnvVars: ["OLLAMA_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash:0731",
      "deepseek-v4-pro",
      "gemma4:31b",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-oss:120b",
      "gpt-oss:20b",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "minimax-m2.5",
      "minimax-m2.7",
      "minimax-m3",
      "mistral-large-3:675b",
      "nemotron-3-nano:30b",
      "nemotron-3-super",
      "nemotron-3-ultra",
      "qwen3.5:397b"
    ]
  },
  {
    id: "openai",
    name: "OpenAI",
    apiKeyEnvVars: ["OPENAI_API_KEY"],
    models: [
      "chatgpt-image-latest",
      "gpt-3.5-turbo",
      "gpt-4",
      "gpt-4-turbo",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-2024-05-13",
      "gpt-4o-2024-08-06",
      "gpt-4o-2024-11-20",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5-pro",
      "gpt-5.1",
      "gpt-5.2",
      "gpt-5.2-chat-latest",
      "gpt-5.2-pro",
      "gpt-5.3-chat-latest",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
      "gpt-5.5",
      "gpt-5.5-pro",
      "gpt-5.6",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-6-astra",
      "gpt-image-1",
      "gpt-image-1-mini",
      "gpt-image-1.5",
      "gpt-image-2",
      "gpt-realtime-2.1",
      "o1",
      "o1-pro",
      "o3",
      "o3-mini",
      "o3-pro",
      "o4-mini",
      "text-embedding-3-large",
      "text-embedding-3-small",
      "text-embedding-ada-002"
    ]
  },
  {
    id: "opencode-go",
    name: "OpenCode Go",
    apiKeyEnvVars: ["OPENCODE_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-5.6-luna",
      "grok-4.5",
      "grok-4.6",
      "hy3",
      "hy4-preview",
      "kimi-k2.5",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "longcat-2.0",
      "mimo-v2-omni",
      "mimo-v2-pro",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "minimax-m2.5",
      "minimax-m2.7",
      "minimax-m3",
      "muse-spark-1.2-contributor",
      "muse-spark-1.3-contributor",
      "omen-alpha",
      "ox-alpha-free",
      "qwen3.5-plus",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-flash",
      "qwen3.8-max"
    ]
  },
  {
    id: "opencode",
    name: "OpenCode Zen",
    apiKeyEnvVars: ["OPENCODE_API_KEY"],
    models: [
      "big-pickle",
      "claude-3-5-haiku",
      "claude-fable-5",
      "claude-fable-5-1",
      "claude-haiku-4-5",
      "claude-opus-4-1",
      "claude-opus-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4",
      "claude-sonnet-4-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "deepseek-v4-flash",
      "deepseek-v4-flash-free",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "gemini-3-flash",
      "gemini-3-pro",
      "gemini-3.1-pro",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.8-flash",
      "glm-4.6",
      "glm-4.7",
      "glm-4.7-free",
      "glm-5",
      "glm-5-free",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-5",
      "gpt-5-codex",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.1-codex",
      "gpt-5.1-codex-max",
      "gpt-5.1-codex-mini",
      "gpt-5.2",
      "gpt-5.2-codex",
      "gpt-5.3-codex",
      "gpt-5.3-codex-spark",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
      "gpt-5.5",
      "gpt-5.5-pro",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-6-astra",
      "grok-4.5",
      "grok-4.6",
      "grok-build-0.1",
      "grok-code",
      "hy3-free",
      "hy3-preview-free",
      "kimi-k2",
      "kimi-k2-thinking",
      "kimi-k2.5",
      "kimi-k2.5-free",
      "kimi-k2.6",
      "kimi-k2.7-code",
      "kimi-k3",
      "laguna-s-2.1-free",
      "ling-2.6-flash-free",
      "ling-3.0-flash-fin-free",
      "ling-3.0-flash-free",
      "ling-3.0-tiny-free",
      "longcat-2.0-free",
      "mimo-v2-flash-free",
      "mimo-v2-omni-free",
      "mimo-v2-pro-free",
      "mimo-v2.5-free",
      "minimax-m2.1",
      "minimax-m2.1-free",
      "minimax-m2.5",
      "minimax-m2.5-free",
      "minimax-m2.7",
      "minimax-m3",
      "minimax-m3-free",
      "muse-spark-1.2",
      "muse-spark-1.2-contributor-free",
      "muse-spark-1.3",
      "muse-spark-1.3-contributor-free",
      "nemotron-3-super-free",
      "nemotron-3-ultra-free",
      "nemotron-3.5-lightning-free",
      "north-mini-code-free",
      "qwen3-coder",
      "qwen3.5-plus",
      "qwen3.6-plus",
      "qwen3.6-plus-free",
      "ring-2.6-1t-free",
      "trinity-large-preview-free",
      "x-preview-f-free"
    ]
  },
  {
    id: "openreason",
    name: "OpenReason",
    apiKeyEnvVars: ["OPENREASON_API_KEY"],
    models: [
      "deepseek-ai/deepseek-v4-flash-0731",
      "moonshotai/kimi-k2.7-code",
      "openai/gpt-oss-120b"
    ]
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    apiKeyEnvVars: ["OPENROUTER_API_KEY"],
    models: [
      "~anthropic/claude-fable-latest",
      "~anthropic/claude-haiku-latest",
      "~anthropic/claude-opus-latest",
      "~anthropic/claude-sonnet-latest",
      "~deepseek/deepseek-v4-flash-latest",
      "~google/gemini-flash-latest",
      "~google/gemini-pro-latest",
      "~moonshotai/kimi-latest",
      "~openai/gpt-latest",
      "~openai/gpt-mini-latest",
      "~x-ai/grok-latest",
      "~z-ai/glm-flash-latest",
      "~z-ai/glm-latest",
      "aion-labs/aion-2.0",
      "aion-labs/aion-3.0",
      "aion-labs/aion-3.0-mini",
      "aion-labs/aion-rp-llama-3.1-8b",
      "amazon/nova-2-lite-v1",
      "amazon/nova-lite-v1",
      "amazon/nova-micro-v1",
      "amazon/nova-premier-v1",
      "amazon/nova-pro-v1",
      "anthracite-org/magnum-v4-72b",
      "anthropic/claude-3-haiku",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "arcee-ai/trinity-large-thinking",
      "baidu/ernie-4.5-vl-424b-a47b",
      "bytedance-seed/seed-1.6",
      "bytedance-seed/seed-1.6-flash",
      "bytedance-seed/seed-2-1-turbo",
      "bytedance-seed/seed-2.0-code",
      "bytedance-seed/seed-2.0-lite",
      "bytedance-seed/seed-2.0-mini",
      "bytedance/ui-tars-1.5-7b",
      "cognitivecomputations/dolphin-mistral-24b-venice-edition",
      "cohere/command-a",
      "cohere/command-r-08-2024",
      "cohere/command-r-plus-08-2024",
      "cohere/command-r7b-12-2024",
      "cohere/north-mini-code:free",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-chat-v3-0324",
      "deepseek/deepseek-chat-v3.1",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-r1-distill-llama-70b",
      "deepseek/deepseek-v3.1-terminus",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-exp",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "dots-studio/dots-3-note-preview:free",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-image",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-2.5-pro-preview",
      "google/gemini-2.5-pro-preview-05-06",
      "google/gemini-3-flash-preview",
      "google/gemini-3-pro-image",
      "google/gemini-3-pro-image-preview",
      "google/gemini-3.1-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-image",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemma-2-27b-it",
      "google/gemma-3-12b-it",
      "google/gemma-3-27b-it",
      "google/gemma-3-4b-it",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-26b-a4b-it:free",
      "google/gemma-4-31b-it",
      "google/gemma-4-31b-it:free",
      "google/lyria-3-clip-preview",
      "google/lyria-3-pro-preview",
      "gryphe/mythomax-l2-13b",
      "ibm-granite/granite-4.0-h-micro",
      "ibm-granite/granite-4.2-8b",
      "inception/mercury-2",
      "inception/mercury-2.5-preview",
      "inclusionai/ling-3.0-flash",
      "inclusionai/ling-3.0-flash-fin",
      "inclusionai/ling-3.0-flash-fin:free",
      "inclusionai/ling-3.0-flash-sante:free",
      "kwaipilot/kat-coder-pro-v2",
      "kwaipilot/kat-coder-pro-v2.5",
      "liquid/lfm-2.5-2.6b:free",
      "mancer/weaver",
      "meituan/longcat-2.0",
      "meta-llama/llama-3.1-70b-instruct",
      "meta-llama/llama-3.1-8b-instruct",
      "meta-llama/llama-3.2-1b-instruct",
      "meta-llama/llama-3.2-3b-instruct",
      "meta-llama/llama-3.3-70b-instruct",
      "meta-llama/llama-4-maverick",
      "meta-llama/llama-4-scout",
      "meta-llama/llama-guard-4-12b",
      "meta/muse-glimmer-30b",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "meta/muse-spark-1.2-contributor",
      "meta/muse-spark-1.3",
      "meta/muse-spark-1.3-contributor",
      "microsoft/phi-4",
      "microsoft/wizardlm-2-8x22b",
      "minimax/minimax-01",
      "minimax/minimax-m1",
      "minimax/minimax-m2",
      "minimax/minimax-m2-her",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7:free",
      "minimax/minimax-m3",
      "minimax/minimax-m3:free",
      "mistralai/codestral-2508",
      "mistralai/devstral-2512",
      "mistralai/ministral-14b-2512",
      "mistralai/ministral-3b-2512",
      "mistralai/ministral-8b-2512",
      "mistralai/mistral-large",
      "mistralai/mistral-large-2407",
      "mistralai/mistral-large-2512",
      "mistralai/mistral-medium-3",
      "mistralai/mistral-medium-3-5",
      "mistralai/mistral-medium-3.1",
      "mistralai/mistral-nemo",
      "mistralai/mistral-saba",
      "mistralai/mistral-small-24b-instruct-2501",
      "mistralai/mistral-small-2603",
      "mistralai/mistral-small-3.1-24b-instruct",
      "mistralai/mistral-small-3.2-24b-instruct",
      "mistralai/mixtral-8x22b-instruct",
      "mistralai/voxtral-small-24b-2507",
      "moonshotai/kimi-k2",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k3",
      "morph/morph-v3-fast",
      "morph/morph-v3-large",
      "nex-agi/nex-n2-mini",
      "nex-agi/nex-n2-pro",
      "nousresearch/hermes-3-llama-3.1-405b",
      "nousresearch/hermes-3-llama-3.1-70b",
      "nousresearch/hermes-4-405b",
      "nousresearch/hermes-4-70b",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-3-super-120b-a12b:free",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3-ultra-550b-a55b:free",
      "nvidia/nemotron-3.5-content-safety",
      "nvidia/nemotron-3.5-content-safety:free",
      "nvidia/nemotron-3.5-lightning",
      "nvidia/nemotron-3.5-lightning:free",
      "openai/gpt-3.5-turbo",
      "openai/gpt-3.5-turbo-0613",
      "openai/gpt-3.5-turbo-16k",
      "openai/gpt-3.5-turbo-instruct",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4-turbo-preview",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-05-13",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-4o-mini-2024-07-18",
      "openai/gpt-5",
      "openai/gpt-5-image",
      "openai/gpt-5-image-mini",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-image-2",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-luna-pro",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-sol-pro",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-terra-pro",
      "openai/gpt-6-astra",
      "openai/gpt-6-astra-pro",
      "openai/gpt-audio",
      "openai/gpt-audio-mini",
      "openai/gpt-chat-latest",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-20b",
      "openai/o1",
      "openai/o1-pro",
      "openai/o3",
      "openai/o3-mini",
      "openai/o3-mini-high",
      "openai/o3-pro",
      "openai/o4-mini",
      "openai/o4-mini-high",
      "openrouter/auto",
      "openrouter/bodybuilder",
      "openrouter/free",
      "openrouter/fusion",
      "openrouter/pareto-code",
      "perceptron/perceptron-mk1",
      "perplexity/sonar",
      "perplexity/sonar-deep-research",
      "perplexity/sonar-pro",
      "perplexity/sonar-pro-search",
      "perplexity/sonar-reasoning-pro",
      "poolside/laguna-s-2.1",
      "poolside/laguna-s-2.1:free",
      "poolside/laguna-xs-2.1",
      "poolside/laguna-xs-2.1:free",
      "qwen/qwen-2.5-72b-instruct",
      "qwen/qwen-2.5-7b-instruct",
      "qwen/qwen-2.5-coder-32b-instruct",
      "qwen/qwen-plus",
      "qwen/qwen-plus-2025-07-28",
      "qwen/qwen2.5-vl-72b-instruct",
      "qwen/qwen3-14b",
      "qwen/qwen3-235b-a22b",
      "qwen/qwen3-235b-a22b-2507",
      "qwen/qwen3-235b-a22b-thinking-2507",
      "qwen/qwen3-30b-a3b",
      "qwen/qwen3-30b-a3b-instruct-2507",
      "qwen/qwen3-30b-a3b-thinking-2507",
      "qwen/qwen3-32b",
      "qwen/qwen3-8b",
      "qwen/qwen3-coder",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-coder-flash",
      "qwen/qwen3-coder-next",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3-max-thinking",
      "qwen/qwen3-next-80b-a3b-instruct",
      "qwen/qwen3-next-80b-a3b-thinking",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3-vl-30b-a3b-instruct",
      "qwen/qwen3-vl-30b-a3b-thinking",
      "qwen/qwen3-vl-32b-instruct",
      "qwen/qwen3-vl-8b-instruct",
      "qwen/qwen3-vl-8b-thinking",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-9b",
      "qwen/qwen3.5-flash-02-23",
      "qwen/qwen3.5-plus-02-15",
      "qwen/qwen3.5-plus-20260420",
      "qwen/qwen3.6-27b",
      "qwen/qwen3.6-35b-a3b",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-max-preview",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-flash",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-2.4t-a95b",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.8-flash",
      "qwen/qwen3.8-max-0902",
      "rekaai/reka-edge",
      "rekaai/reka-flash-3",
      "relace/relace-apply-3",
      "relace/relace-search",
      "sakana/fugu-ultra",
      "sakana/sakana-namazu",
      "sao10k/l3-lunaris-8b",
      "sao10k/l3.1-euryale-70b",
      "sao10k/l3.3-euryale-70b",
      "stepfun/step-3.5-flash",
      "stepfun/step-3.7-flash",
      "tencent/hunyuan-a13b-instruct",
      "tencent/hy-mt2-1.8b",
      "tencent/hy-mt2-30b-a3b",
      "tencent/hy-mt2-7b",
      "tencent/hy3",
      "tencent/hy3-preview",
      "tencent/hy4-preview",
      "thedrummer/cydonia-24b-v4.1",
      "thedrummer/skyfall-36b-v2",
      "thedrummer/unslopnemo-12b",
      "thinkingmachines/inkling",
      "thinkingmachines/inkling-small",
      "thinkingmachines/inkling-small:free",
      "thinkingmachines/inkling:free",
      "undi95/remm-slerp-l2-13b",
      "upstage/solar-pro-3",
      "upstage/solar-pro4",
      "writer/palmyra-x5",
      "x-ai/grok-4.20",
      "x-ai/grok-4.20-multi-agent",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-4.6",
      "x-ai/grok-build-0.1",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "z-ai/glm-4.5",
      "z-ai/glm-4.5-air",
      "z-ai/glm-4.5v",
      "z-ai/glm-4.6",
      "z-ai/glm-4.6v",
      "z-ai/glm-4.7",
      "z-ai/glm-4.7-flash",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash",
      "z-ai/glm-5v-turbo"
    ]
  },
  {
    id: "opper",
    name: "Opper",
    apiKeyEnvVars: ["OPPER_API_KEY"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-5",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-opus-4-8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-6",
      "anthropic/claude-sonnet-5",
      "gemini/gemini-3-flash-preview",
      "gemini/gemini-3.1-pro-preview",
      "gemini/gemini-3.5-flash",
      "gemini/gemini-3.5-flash-lite",
      "meta/muse-spark-1.2",
      "minimax/m3",
      "mistral/devstral-2512",
      "mistral/mistral-large-2512",
      "mistral/mistral-small-2603",
      "moonshot/kimi-k3",
      "openai/gpt-5.3-chat-latest",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "perplexity/sonar",
      "perplexity/sonar-pro",
      "perplexity/sonar-reasoning-pro",
      "vertexai/gemini-3.7-flash",
      "vertexai/gemini-3.7-flash-eu",
      "xai/grok-4.3",
      "xai/grok-4.5",
      "xai/grok-4.6",
      "xai/grok-build-0.1"
    ]
  },
  {
    id: "orcarouter",
    name: "OrcaRouter",
    apiKeyEnvVars: ["ORCAROUTER_API_KEY"],
    models: [
      "anthropic/claude-fable-5",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-5",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-reasoner",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-free",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.1-pro-preview-customtools",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.6-flash",
      "google/gemini-flash-latest",
      "google/gemini-flash-lite-latest",
      "google/gemini-robotics-er-1.6-preview",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-31b-it",
      "grok/grok-4.3",
      "grok/grok-4.5",
      "grok/grok-4.6",
      "kimi/kimi-k2.5",
      "kimi/kimi-k2.6",
      "kimi/kimi-k2.7-code",
      "kimi/kimi-k3",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-2024-05-13",
      "openai/gpt-4o-2024-08-06",
      "openai/gpt-4o-2024-11-20",
      "openai/gpt-4o-mini",
      "openai/gpt-5",
      "openai/gpt-5-chat-latest",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-chat-latest",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-chat-latest",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-oss-120b",
      "orcarouter/auto",
      "orcarouter/free",
      "orcarouter/fusion",
      "orcarouter/fusion-flash",
      "orcarouter/fusion-mini",
      "qwen/qwen3-max",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3-vl-235b-a22b-thinking",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-27b",
      "qwen/qwen3.5-35b-a3b",
      "qwen/qwen3.5-397b-a17b",
      "qwen/qwen3.5-flash",
      "qwen/qwen3.5-plus",
      "qwen/qwen3.6-35b-a3b",
      "qwen/qwen3.6-flash",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-flash",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "qwen/qwen3.8-27b",
      "qwen/qwen3.8-27b-free",
      "qwen/qwen3.8-max",
      "tencent/hy3",
      "tencent/hy3-free",
      "z-ai/glm-4.5",
      "z-ai/glm-4.5-air",
      "z-ai/glm-4.6",
      "z-ai/glm-4.7",
      "z-ai/glm-5",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash"
    ]
  },
  {
    id: "ovhcloud",
    name: "OVHcloud AI Endpoints",
    apiKeyEnvVars: ["OVHCLOUD_API_KEY"],
    models: [
      "gpt-oss-120b",
      "gpt-oss-20b",
      "meta-llama-3_3-70b-instruct",
      "mistral-7b-instruct-v0.3",
      "mistral-nemo-instruct-2407",
      "mistral-small-3.2-24b-instruct-2506",
      "qwen2.5-vl-72b-instruct",
      "qwen3-32b",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3.5-397b-a17b",
      "qwen3.5-9b",
      "qwen3.6-27b",
      "qwen3.8-27b",
      "qwen3guard-gen-0.6b",
      "qwen3guard-gen-8b"
    ]
  },
  {
    id: "pendra",
    name: "Pendra",
    apiKeyEnvVars: ["PENDRA_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "glm-4.7-flash",
      "gpt-oss:120b",
      "llama3.3:70b",
      "qwen3-coder:30b",
      "qwen3.6:27b"
    ]
  },
  {
    id: "perplexity",
    name: "Perplexity",
    apiKeyEnvVars: ["PERPLEXITY_API_KEY"],
    models: ["sonar", "sonar-deep-research", "sonar-pro", "sonar-reasoning-pro"]
  },
  {
    id: "perplexity-agent",
    name: "Perplexity Agent",
    apiKeyEnvVars: ["PERPLEXITY_API_KEY"],
    models: [
      "anthropic/claude-haiku-4-5",
      "anthropic/claude-opus-4-5",
      "anthropic/claude-opus-4-6",
      "anthropic/claude-opus-4-7",
      "anthropic/claude-sonnet-4-5",
      "anthropic/claude-sonnet-4-6",
      "deepseek/deepseek-v4-flash-0731",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3.1-pro-preview",
      "moonshot-ai/kimi-k2.7-code",
      "moonshot-ai/kimi-k3",
      "nvidia/nemotron-3-super-120b-a12b",
      "openai/gpt-5-mini",
      "openai/gpt-5.1",
      "openai/gpt-5.2",
      "openai/gpt-5.4",
      "openai/gpt-5.5",
      "perplexity/sonar",
      "xai/grok-4-1-fast-non-reasoning",
      "xai/grok-4.6"
    ]
  },
  {
    id: "pioneer",
    name: "Pioneer",
    apiKeyEnvVars: ["PIONEER_API_KEY"],
    models: [
      "claude-3-7-sonnet-latest",
      "claude-fable-5",
      "claude-haiku-4-5",
      "claude-opus-4-1",
      "claude-opus-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "devstral-2",
      "fastino/gliguard-LLMGuardrails-300M",
      "fastino/gliner2-base-v1",
      "fastino/gliner2-large-v1",
      "fastino/gliner2-multi-large-v1",
      "fastino/gliner2-multi-v1",
      "fastino/gliner2-privacy-filter-PII-multi",
      "gemini-3-flash",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.6-flash",
      "google/diffusiongemma-26B-A4B-it",
      "google/gemma-3-4b-pt",
      "google/gemma-4-12B-it",
      "google/gemma-4-31B-it",
      "google/gemma-4-E2B-it",
      "google/gemma-4-E4B-it",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.5",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "grok-4.5",
      "HuggingFaceTB/SmolLM3-3B-Base",
      "LiquidAI/LFM2-24B-A2B",
      "meta-llama/Llama-3.1-8B-Instruct",
      "meta-llama/Llama-3.2-1B",
      "meta-llama/Llama-3.2-1B-Instruct",
      "meta-llama/Llama-3.2-3B",
      "meta-llama/Llama-3.2-3B-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
      "meta/muse-spark-1.1",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "mistral-large-3",
      "mistral-medium-3.5",
      "mistralai/Codestral-22B-v0.1",
      "mistralai/Magistral-Small-2506",
      "mistralai/Ministral-8B-Instruct-2410",
      "mistralai/Mistral-7B-Instruct-v0.3",
      "mistralai/Mistral-Nemo-Instruct-2407",
      "mistralai/Mistral-Small-4-119B-2603",
      "mistralai/Pixtral-12B-2409",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16",
      "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8",
      "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16",
      "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "pioneer/auto",
      "poolside/laguna-s-2.1",
      "Qwen/Qwen2.5-Coder-0.5B",
      "Qwen/Qwen3-1.7B-Base",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-4B-Base",
      "Qwen/Qwen3-4B-Instruct-2507",
      "Qwen/Qwen3-8B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.6-35B-A3B",
      "qwen3.6-flash",
      "qwen3.6-max-preview",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "sakana/fugu-ultra",
      "XiaomiMiMo/MiMo-V2.5",
      "XiaomiMiMo/MiMo-V2.5-Pro",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2"
    ]
  },
  {
    id: "poe",
    name: "Poe",
    apiKeyEnvVars: ["POE_API_KEY"],
    models: [
      "anthropic/claude-haiku-3",
      "anthropic/claude-haiku-3.5",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-sonnet-3.5",
      "anthropic/claude-sonnet-3.5-june",
      "anthropic/claude-sonnet-3.7",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "cerebras/gpt-oss-120b-cs",
      "cerebras/llama-3.1-8b-cs",
      "cerebras/llama-3.3-70b-cs",
      "cerebras/qwen3-235b-2507-cs",
      "cerebras/qwen3-32b-cs",
      "elevenlabs/elevenlabs-music",
      "elevenlabs/elevenlabs-v2.5-turbo",
      "elevenlabs/elevenlabs-v3",
      "empiriolabs/deepseek-v4-flash-el",
      "empiriolabs/deepseek-v4-pro-el",
      "fireworks-ai/kimi-k2.5-fw",
      "google/gemini-2.0-flash",
      "google/gemini-2.0-flash-lite",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash",
      "google/gemini-3-pro",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-pro",
      "google/gemini-3.5-flash",
      "google/gemini-deep-research",
      "google/gemma-4-31b",
      "google/imagen-3",
      "google/imagen-3-fast",
      "google/imagen-4",
      "google/imagen-4-fast",
      "google/imagen-4-ultra",
      "google/lyria",
      "google/nano-banana",
      "google/nano-banana-pro",
      "google/veo-2",
      "google/veo-3",
      "google/veo-3-fast",
      "google/veo-3.1",
      "google/veo-3.1-fast",
      "ideogramai/ideogram",
      "ideogramai/ideogram-v2",
      "ideogramai/ideogram-v2a",
      "ideogramai/ideogram-v2a-turbo",
      "lumalabs/ray2",
      "novita/deepseek-v3.2",
      "novita/glm-4.6",
      "novita/glm-4.6v",
      "novita/glm-4.7",
      "novita/glm-4.7-flash",
      "novita/glm-4.7-n",
      "novita/glm-5",
      "novita/kimi-k2-thinking",
      "novita/kimi-k2.5",
      "novita/kimi-k2.6",
      "novita/minimax-m2.1",
      "openai/chatgpt-4o-latest",
      "openai/dall-e-3",
      "openai/gpt-3.5-turbo",
      "openai/gpt-3.5-turbo-instruct",
      "openai/gpt-3.5-turbo-raw",
      "openai/gpt-4-classic",
      "openai/gpt-4-classic-0314",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-nano",
      "openai/gpt-4o",
      "openai/gpt-4o-aug",
      "openai/gpt-4o-mini",
      "openai/gpt-4o-mini-search",
      "openai/gpt-4o-search",
      "openai/gpt-5",
      "openai/gpt-5-chat",
      "openai/gpt-5-codex",
      "openai/gpt-5-mini",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.1-instant",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-instant",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.3-codex-spark",
      "openai/gpt-5.3-instant",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-pro",
      "openai/gpt-image-1",
      "openai/gpt-image-1-mini",
      "openai/gpt-image-1.5",
      "openai/gpt-image-2",
      "openai/o1",
      "openai/o1-pro",
      "openai/o3",
      "openai/o3-deep-research",
      "openai/o3-mini",
      "openai/o3-mini-high",
      "openai/o3-pro",
      "openai/o4-mini",
      "openai/o4-mini-deep-research",
      "openai/sora-2",
      "openai/sora-2-pro",
      "poetools/claude-code",
      "runwayml/runway",
      "runwayml/runway-gen-4-turbo",
      "stabilityai/stablediffusionxl",
      "topazlabs-co/topazlabs",
      "trytako/tako",
      "xai/grok-3",
      "xai/grok-3-mini",
      "xai/grok-4",
      "xai/grok-4-fast-non-reasoning",
      "xai/grok-4-fast-reasoning",
      "xai/grok-4.1-fast-non-reasoning",
      "xai/grok-4.1-fast-reasoning",
      "xai/grok-4.20-multi-agent",
      "xai/grok-code-fast-1"
    ]
  },
  {
    id: "poolside",
    name: "Poolside",
    apiKeyEnvVars: ["POOLSIDE_API_KEY"],
    models: ["poolside/laguna-m.1", "poolside/laguna-s-2.1", "poolside/laguna-xs-2.1"]
  },
  {
    id: "privatemode-ai",
    name: "Privatemode AI",
    apiKeyEnvVars: ["PRIVATEMODE_API_KEY"],
    models: [
      "deepseek-ocr-2",
      "gpt-oss-120b",
      "kimi-k2.6",
      "kimi-latest",
      "qwen3-embedding-4b",
      "voxtral-mini-3b",
      "whisper-large-v3"
    ]
  },
  {
    id: "qihang-ai",
    name: "QiHang",
    apiKeyEnvVars: ["QIHANG_API_KEY"],
    models: [
      "claude-haiku-4-5-20251001",
      "claude-opus-4-5-20251101",
      "claude-sonnet-4-5-20250929",
      "gemini-2.5-flash",
      "gemini-3-flash-preview",
      "gemini-3-pro-preview",
      "gpt-5-mini",
      "gpt-5.2",
      "gpt-5.2-codex"
    ]
  },
  {
    id: "qiniu-ai",
    name: "Qiniu",
    apiKeyEnvVars: ["QINIU_API_KEY"],
    models: [
      "claude-3.5-haiku",
      "claude-3.5-sonnet",
      "claude-3.7-sonnet",
      "claude-4.0-opus",
      "claude-4.0-sonnet",
      "claude-4.1-opus",
      "claude-4.5-haiku",
      "claude-4.5-opus",
      "claude-4.5-sonnet",
      "deepseek-r1",
      "deepseek-r1-0528",
      "deepseek-v3",
      "deepseek-v3-0324",
      "deepseek-v3.1",
      "deepseek/deepseek-math-v2",
      "deepseek/deepseek-v3.1-terminus",
      "deepseek/deepseek-v3.1-terminus-thinking",
      "deepseek/deepseek-v3.2-251201",
      "deepseek/deepseek-v3.2-exp",
      "deepseek/deepseek-v3.2-exp-thinking",
      "doubao-1.5-pro-32k",
      "doubao-1.5-thinking-pro",
      "doubao-1.5-vision-pro",
      "doubao-seed-1.6",
      "doubao-seed-1.6-flash",
      "doubao-seed-1.6-thinking",
      "doubao-seed-2.0-code",
      "doubao-seed-2.0-lite",
      "doubao-seed-2.0-mini",
      "doubao-seed-2.0-pro",
      "gemini-2.0-flash",
      "gemini-2.0-flash-lite",
      "gemini-2.5-flash",
      "gemini-2.5-flash-image",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3.0-flash-preview",
      "gemini-3.0-pro-image-preview",
      "gemini-3.0-pro-preview",
      "glm-4.5",
      "glm-4.5-air",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "kimi-k2",
      "kling-v2-6",
      "meituan/longcat-flash-chat",
      "meituan/longcat-flash-lite",
      "mimo-v2-flash",
      "MiniMax-M1",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "openai/gpt-5",
      "openai/gpt-5.2",
      "qwen-max-2025-01-25",
      "qwen-turbo",
      "qwen-vl-max-2025-01-25",
      "qwen2.5-vl-72b-instruct",
      "qwen2.5-vl-7b-instruct",
      "qwen3-235b-a22b",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-235b-a22b-thinking-2507",
      "qwen3-30b-a3b",
      "qwen3-30b-a3b-instruct-2507",
      "qwen3-30b-a3b-thinking-2507",
      "qwen3-32b",
      "qwen3-coder-480b-a35b-instruct",
      "qwen3-max",
      "qwen3-max-preview",
      "qwen3-next-80b-a3b-instruct",
      "qwen3-next-80b-a3b-thinking",
      "qwen3-vl-30b-a3b-thinking",
      "qwen3.5-397b-a17b",
      "stepfun-ai/gelab-zero-4b-preview",
      "stepfun/step-3.5-flash",
      "x-ai/grok-4-fast",
      "x-ai/grok-4-fast-non-reasoning",
      "x-ai/grok-4-fast-reasoning",
      "x-ai/grok-4.1-fast",
      "x-ai/grok-4.1-fast-non-reasoning",
      "x-ai/grok-4.1-fast-reasoning",
      "x-ai/grok-code-fast-1",
      "xiaomi/mimo-v2-flash",
      "z-ai/autoglm-phone-9b",
      "z-ai/glm-4.6",
      "z-ai/glm-4.7",
      "z-ai/glm-5"
    ]
  },
  {
    id: "regolo-ai",
    name: "Regolo AI",
    apiKeyEnvVars: ["REGOLO_API_KEY"],
    models: [
      "apertus-70b",
      "brick-complexity-pro",
      "brick-v1-beta",
      "deepseek-ocr-2",
      "faster-whisper-large-v3",
      "gemma4-31b",
      "glm5.2",
      "gpt-oss-120b",
      "gpt-oss-20b",
      "llama-3.3-70b-instruct",
      "mistral-small-4-119b",
      "qwen-image",
      "qwen3-coder-next",
      "qwen3-embedding-8b",
      "qwen3-reranker-4b",
      "qwen3.5-122b",
      "qwen3.5-9b",
      "qwen3.8-27b"
    ]
  },
  {
    id: "requesty",
    name: "Requesty",
    apiKeyEnvVars: ["REQUESTY_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-fable-5.1",
      "claude-fable-5.1@eu",
      "claude-fable-5@eu",
      "claude-haiku-4-5",
      "claude-haiku-4-5@eu",
      "claude-opus-4-1",
      "claude-opus-4-5",
      "claude-opus-4-5@eu",
      "claude-opus-4-6",
      "claude-opus-4-6@eu",
      "claude-opus-4-7",
      "claude-opus-4-7@eu",
      "claude-opus-4-8",
      "claude-opus-4-8@eu",
      "claude-opus-5",
      "claude-opus-5@eu",
      "claude-sonnet-4-5",
      "claude-sonnet-4-5@eu",
      "claude-sonnet-4-6",
      "claude-sonnet-4-6@eu",
      "claude-sonnet-4@eu",
      "claude-sonnet-5",
      "claude-sonnet-5@eu",
      "deepseek-v4-flash",
      "deepseek-v4-flash-0731",
      "deepseek-v4-flash-0731@eu",
      "deepseek-v4-pro",
      "deepseek-v4-pro-0813",
      "deepseek-v4-pro-0813@eu",
      "deepseek-v4-pro@eu",
      "devstral-latest",
      "devstral-latest@eu",
      "fugu-ultra",
      "gemini-2.5-flash-lite@eu",
      "gemini-2.5-flash@eu",
      "gemini-2.5-pro@eu",
      "gemini-3-pro-image",
      "gemini-3.1-flash-image",
      "gemini-3.1-flash-lite",
      "gemini-3.1-flash-lite@eu",
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.5-flash-lite@eu",
      "gemini-3.5-flash@eu",
      "gemini-3.6-flash",
      "gemini-3.7-flash",
      "gemini-3.7-flash@eu",
      "gemini-3.8-flash",
      "gemini-3.8-flash@eu",
      "gemma-4-26b-a4b-it",
      "gemma-4-31b-it",
      "glm-5.1",
      "glm-5.1@eu",
      "glm-5.2",
      "glm-5.2-fast",
      "glm-5.2@eu",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5.3-flash@eu",
      "glm-5.3@eu",
      "gpt-4.1-mini@eu",
      "gpt-4.1-nano@eu",
      "gpt-4.1@eu",
      "gpt-4o-mini@eu",
      "gpt-5-mini@eu",
      "gpt-5-nano@eu",
      "gpt-5.1@eu",
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
      "gpt-5.4@eu",
      "gpt-5.5",
      "gpt-5.5-pro",
      "gpt-5.5@eu",
      "gpt-5.6-luna",
      "gpt-5.6-luna@eu",
      "gpt-5.6-sol",
      "gpt-5.6-sol@eu",
      "gpt-5.6-terra",
      "gpt-5.6-terra@eu",
      "gpt-5@eu",
      "grok-4.2-beta",
      "grok-4.3",
      "grok-4.5",
      "grok-4.6",
      "grok-build-0.1",
      "hy3",
      "inkling",
      "inkling-256k",
      "kat-coder-pro",
      "kimi-k2.6",
      "kimi-k2.6@eu",
      "kimi-k2.7-code",
      "kimi-k2.7-code@eu",
      "kimi-k3",
      "kimi-k3@eu",
      "laguna-m.1",
      "laguna-xs.2",
      "leanstral-1-5",
      "leanstral-1-5@eu",
      "ling-2.6-1t",
      "ling-2.6-flash",
      "ling-3.0-tiny",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "minimax-m2.7",
      "minimax-m2.7-highspeed",
      "minimax-m3",
      "minimax-m3@eu",
      "mistral-medium-3-5",
      "mistral-medium-3-5@eu",
      "mistral-medium-latest",
      "mistral-medium-latest@eu",
      "mistral-small-2603",
      "mistral-small-2603@eu",
      "muse-glimmer-30b",
      "nemotron-3-nano-omni",
      "nemotron-3-nano-omni-30b-a3b-reasoning",
      "nemotron-3-nano-omni@eu",
      "nemotron-3-super-120b-a12b",
      "nemotron-3-ultra-550b-a55b",
      "nemotron-3-ultra-nvfp4",
      "nemotron-3.5-content-safety",
      "nemotron-3.5-lightning-30b-a3b",
      "nemotron-lightning-3.5-30b-a3b",
      "nvidia-nemotron-3-super-120b-a12b",
      "nvidia-nemotron-3-ultra",
      "o4-mini@eu",
      "qwen3.5-27b",
      "qwen3.5-2b",
      "qwen3.5-35b-a3b",
      "qwen3.6-plus",
      "qwen3.7-max",
      "qwen3.7-plus",
      "qwen3.8-2.4T-A95B",
      "qwen3.8-2.4T-A95B@eu",
      "qwen3.8-flash",
      "qwen3.8-flash-next",
      "qwen3.8-flash-next@eu",
      "qwen3.8-max",
      "ring-2.6-1t",
      "seed-1.8",
      "seed-2.0-code",
      "seed-2.0-mini",
      "seed-2.0-pro",
      "step-3.7-flash",
      "thinkingcap-qwen3.6-27b",
      "thinkingcap-qwen3.6-27b@eu"
    ]
  },
  {
    id: "routing-run",
    name: "routing.run",
    apiKeyEnvVars: ["ROUTING_RUN_API_KEY"],
    models: [
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "glm-5.2",
      "glm-5.2-nitro",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "kimi-k2.6",
      "kimi-k2.6-nitro",
      "kimi-k2.7-code",
      "kimi-k2.7-code-nitro",
      "nemotron-3-ultra",
      "qwen3.5-9b"
    ]
  },
  {
    id: "runinfra",
    name: "RunInfra",
    apiKeyEnvVars: ["RUNINFRA_GATEWAY_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "Inferact/Qwen3.8-2.4T-A95B-NVFP4",
      "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16",
      "ornith-ai/Ornith-1.5-35B-A3B",
      "Qwen/Qwen3.8-27B",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "sakana",
    name: "Sakana AI",
    apiKeyEnvVars: ["SAKANA_API_KEY"],
    models: ["fugu", "fugu-ultra", "fugu-ultra-20260615", "sakana-namazu"]
  },
  {
    id: "sarvam",
    name: "Sarvam AI",
    apiKeyEnvVars: ["SARVAM_API_KEY"],
    models: ["sarvam-105b", "sarvam-30b"]
  },
  {
    id: "scaleway",
    name: "Scaleway",
    apiKeyEnvVars: ["SCALEWAY_API_KEY"],
    models: [
      "bge-multilingual-gemma2",
      "deepseek-v4-flash-0731",
      "gemma-4-26b-a4b-it",
      "glm-5.2",
      "gpt-oss-120b",
      "llama-3.3-70b-instruct",
      "mistral-medium-3.5-128b",
      "mistral-small-3.2-24b-instruct-2506",
      "pixtral-12b-2409",
      "qwen3-235b-a22b-instruct-2507",
      "qwen3-coder-30b-a3b-instruct",
      "qwen3-embedding-8b",
      "qwen3.5-397b-a17b",
      "qwen3.6-35b-a3b",
      "whisper-large-v3"
    ]
  },
  {
    id: "scnet-token-plan",
    name: "SCNet Token Plan",
    apiKeyEnvVars: ["SCNET_API_KEY"],
    models: [
      "DeepSeek-V3.2",
      "DeepSeek-V4-Flash",
      "DeepSeek-V4-Flash-0731",
      "DeepSeek-V4-Pro",
      "DeepSeek-V4-Pro-0813",
      "GLM-5",
      "GLM-5.1",
      "GLM-5.2",
      "GLM-5.3",
      "GLM-5.3-Flash",
      "Kimi-K2.5",
      "Kimi-K2.6",
      "Kimi-K2.7-Code",
      "Kimi-K3",
      "MiMo-V2.5-Pro",
      "MiniMax-M2.5",
      "MiniMax-M2.7",
      "MiniMax-M3",
      "Qwen3.8-Flash",
      "Qwen3.8-Max"
    ]
  },
  {
    id: "scx-ai",
    name: "SCX.ai",
    apiKeyEnvVars: ["SCX_API_KEY"],
    models: ["GLM-5.2", "gpt-oss-120b", "MiniMax-M2.7", "Qwen3.8-Max"]
  },
  {
    id: "sensenova",
    name: "SenseNova (China)",
    apiKeyEnvVars: ["SENSENOVA_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "glm-5.2",
      "kimi-k3",
      "sensenova-6.8-flash-lite"
    ]
  },
  {
    id: "siliconflow",
    name: "SiliconFlow",
    apiKeyEnvVars: ["SILICONFLOW_API_KEY"],
    models: [
      "baidu/ERNIE-4.5-300B-A47B",
      "ByteDance-Seed/Seed-OSS-36B-Instruct",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V3.1-Terminus",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V3.2-Exp",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "google/gemma-4-26B-A4B-it",
      "google/gemma-4-31B-it",
      "inclusionAI/Ling-flash-2.0",
      "MiniMaxAI/MiniMax-M2.5",
      "moonshotai/Kimi-K2.5",
      "moonshotai/Kimi-K2.6",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen2.5-7B-Instruct",
      "Qwen/Qwen3-14B",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-8B",
      "Qwen/Qwen3-Coder-30B-A3B-Instruct",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Thinking",
      "Qwen/Qwen3-VL-30B-A3B-Instruct",
      "Qwen/Qwen3-VL-30B-A3B-Thinking",
      "Qwen/Qwen3-VL-32B-Instruct",
      "Qwen/Qwen3-VL-32B-Thinking",
      "Qwen/Qwen3-VL-8B-Instruct",
      "Qwen/Qwen3.5-122B-A10B",
      "Qwen/Qwen3.5-27B",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.6-35B-A3B",
      "stepfun-ai/Step-3.5-Flash",
      "tencent/Hunyuan-A13B-Instruct",
      "tencent/Hy3-preview",
      "zai-org/GLM-4.5-Air",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5V-Turbo"
    ]
  },
  {
    id: "siliconflow-cn",
    name: "SiliconFlow (China)",
    apiKeyEnvVars: ["SILICONFLOW_CN_API_KEY"],
    models: [
      "baidu/ERNIE-4.5-300B-A47B",
      "ByteDance-Seed/Seed-OSS-36B-Instruct",
      "deepseek-ai/DeepSeek-OCR",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3.1-Terminus",
      "deepseek-ai/DeepSeek-V3.2",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Pro",
      "inclusionAI/Ling-flash-2.0",
      "PaddlePaddle/PaddleOCR-VL-1.5",
      "Pro/deepseek-ai/DeepSeek-R1",
      "Pro/deepseek-ai/DeepSeek-V3",
      "Pro/deepseek-ai/DeepSeek-V3.1-Terminus",
      "Pro/deepseek-ai/DeepSeek-V3.2",
      "Pro/MiniMaxAI/MiniMax-M2.5",
      "Pro/moonshotai/Kimi-K2.5",
      "Pro/moonshotai/Kimi-K2.6",
      "Pro/zai-org/GLM-5",
      "Pro/zai-org/GLM-5.1",
      "Qwen/Qwen2.5-72B-Instruct",
      "Qwen/Qwen2.5-7B-Instruct",
      "Qwen/Qwen3-14B",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3-32B",
      "Qwen/Qwen3-8B",
      "Qwen/Qwen3-Coder-30B-A3B-Instruct",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Instruct",
      "Qwen/Qwen3-VL-235B-A22B-Thinking",
      "Qwen/Qwen3-VL-30B-A3B-Instruct",
      "Qwen/Qwen3-VL-30B-A3B-Thinking",
      "Qwen/Qwen3-VL-32B-Instruct",
      "Qwen/Qwen3-VL-32B-Thinking",
      "Qwen/Qwen3-VL-8B-Instruct",
      "Qwen/Qwen3.5-122B-A10B",
      "Qwen/Qwen3.5-27B",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.5-4B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-35B-A3B",
      "stepfun-ai/Step-3.5-Flash",
      "tencent/Hunyuan-A13B-Instruct",
      "zai-org/GLM-4.5-Air",
      "zai-org/GLM-5.2"
    ]
  },
  {
    id: "snowflake-cortex",
    name: "Snowflake Cortex",
    apiKeyEnvVars: ["SNOWFLAKE_CORTEX_PAT"],
    models: [
      "claude-fable-5",
      "claude-haiku-4-5",
      "claude-opus-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-opus-4-8",
      "claude-opus-5",
      "claude-sonnet-4-5",
      "claude-sonnet-4-6",
      "claude-sonnet-5",
      "deepseek-r1",
      "gemini-3.1-pro",
      "mistral-large2",
      "openai-gpt-4.1",
      "openai-gpt-5",
      "openai-gpt-5-mini",
      "openai-gpt-5-nano",
      "openai-gpt-5.1",
      "openai-gpt-5.2",
      "openai-gpt-5.4",
      "openai-gpt-5.5",
      "openai-gpt-5.6-luna",
      "openai-gpt-5.6-sol",
      "openai-gpt-5.6-terra",
      "snowflake-llama3.3-70b"
    ]
  },
  {
    id: "stackit",
    name: "STACKIT",
    apiKeyEnvVars: ["STACKIT_API_KEY"],
    models: [
      "cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic",
      "google/gemma-3-27b-it",
      "intfloat/e5-mistral-7b-instruct",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "Qwen/Qwen3-VL-235B-A22B-Instruct-FP8",
      "Qwen/Qwen3-VL-Embedding-8B",
      "Qwen/Qwen3.6-27B"
    ]
  },
  {
    id: "standardcompute",
    name: "Standard Compute",
    apiKeyEnvVars: ["STANDARDCOMPUTE_API_KEY"],
    models: ["standardcompute"]
  },
  {
    id: "stepfun",
    name: "StepFun (China)",
    apiKeyEnvVars: ["STEPFUN_API_KEY"],
    models: [
      "step-1-32k",
      "step-2-16k",
      "step-3.5-flash",
      "step-3.5-flash-2603",
      "step-3.7-flash",
      "step-tts-2",
      "stepaudio-2.5-asr",
      "stepaudio-2.5-tts"
    ]
  },
  {
    id: "stepfun-ai",
    name: "StepFun (Global)",
    apiKeyEnvVars: ["STEPFUN_API_KEY"],
    models: [
      "step-1-32k",
      "step-2-16k",
      "step-3.5-flash",
      "step-3.5-flash-2603",
      "step-3.7-flash",
      "step-tts-2",
      "stepaudio-2.5-asr",
      "stepaudio-2.5-tts"
    ]
  },
  {
    id: "stepfun-step-plan",
    name: "StepFun Step Plan (China)",
    apiKeyEnvVars: ["STEPFUN_API_KEY"],
    models: ["step-3.5-flash", "step-3.5-flash-2603", "step-3.7-flash", "step-router-v1"]
  },
  {
    id: "stepfun-ai-step-plan",
    name: "StepFun Step Plan (Global)",
    apiKeyEnvVars: ["STEPFUN_API_KEY"],
    models: ["step-3.5-flash", "step-3.5-flash-2603", "step-3.7-flash"]
  },
  {
    id: "subconscious",
    name: "Subconscious",
    apiKeyEnvVars: ["SUBCONSCIOUS_API_KEY"],
    models: ["subconscious/glm-5.2", "subconscious/tim-qwen3.6-27b"]
  },
  {
    id: "submodel",
    name: "submodel",
    apiKeyEnvVars: ["SUBMODEL_INSTAGEN_ACCESS_KEY"],
    models: [
      "deepseek-ai/DeepSeek-R1-0528",
      "deepseek-ai/DeepSeek-V3-0324",
      "deepseek-ai/DeepSeek-V3.1",
      "openai/gpt-oss-120b",
      "Qwen/Qwen3-235B-A22B-Instruct-2507",
      "Qwen/Qwen3-235B-A22B-Thinking-2507",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
      "zai-org/GLM-4.5-Air",
      "zai-org/GLM-4.5-FP8"
    ]
  },
  {
    id: "synthetic",
    name: "Synthetic",
    apiKeyEnvVars: ["SYNTHETIC_API_KEY"],
    models: [
      "hf:MiniMaxAI/MiniMax-M3",
      "hf:moonshotai/Kimi-K2.7-Code",
      "hf:moonshotai/Kimi-K3",
      "hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4",
      "hf:openai/gpt-oss-120b",
      "hf:Qwen/Qwen3.6-27B",
      "hf:zai-org/GLM-4.7-Flash",
      "hf:zai-org/GLM-5.2",
      "hf:zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "tencent-coding-plan",
    name: "Tencent Coding Plan (China)",
    apiKeyEnvVars: ["TENCENT_CODING_PLAN_API_KEY"],
    models: [
      "glm-5",
      "hunyuan-2.0-instruct",
      "hunyuan-2.0-thinking",
      "hunyuan-t1",
      "hunyuan-turbos",
      "kimi-k2.5",
      "minimax-m2.5",
      "tc-code-latest"
    ]
  },
  {
    id: "tencent-token-plan",
    name: "Tencent Token Plan",
    apiKeyEnvVars: ["TENCENT_TOKEN_PLAN_API_KEY"],
    models: ["hy3", "hy4-preview"]
  },
  {
    id: "tencent-tokenhub",
    name: "Tencent TokenHub",
    apiKeyEnvVars: ["TENCENT_TOKENHUB_API_KEY"],
    models: ["hy3", "hy3-preview", "hy4-preview"]
  },
  {
    id: "tensorx",
    name: "TensorX",
    apiKeyEnvVars: ["TENSORX_API_KEY"],
    models: [
      "deepseek/deepseek-chat-v3.1",
      "deepseek/deepseek-r1-0528",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-pro",
      "minimax/minimax-m2.5",
      "minimax/minimax-m3",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k3",
      "nvidia/nemotron-3-super-120b-a12b",
      "openai/gpt-oss-120b",
      "qwen/qwen3-235b-a22b-2507",
      "qwen/qwen3-coder-30b-a3b-instruct",
      "qwen/qwen3-vl-235b-a22b-instruct",
      "qwen/qwen3.5-122b-a10b",
      "qwen/qwen3.5-9b",
      "z-ai/glm-4.7",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5v-turbo"
    ]
  },
  {
    id: "the-grid-ai",
    name: "The Grid AI",
    apiKeyEnvVars: ["THEGRID_API_KEY"],
    models: [
      "agent-max",
      "agent-prime",
      "agent-standard",
      "code-max",
      "code-prime",
      "code-standard",
      "text-max",
      "text-prime",
      "text-standard"
    ]
  },
  {
    id: "thinkingmachines",
    name: "Thinking Machines",
    apiKeyEnvVars: ["TINKER_API_KEY"],
    models: ["thinkingmachines/Inkling", "thinkingmachines/Inkling:peft:262144"]
  },
  {
    id: "tinfoil",
    name: "Tinfoil",
    apiKeyEnvVars: ["TINFOIL_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "gemma4-31b",
      "glm-5-3-flash",
      "gpt-oss-120b",
      "gpt-oss-safeguard-120b",
      "kimi-k3",
      "llama3-3-70b",
      "nomic-embed-text"
    ]
  },
  {
    id: "togetherai",
    name: "Together AI",
    apiKeyEnvVars: ["TOGETHER_API_KEY"],
    models: [
      "deepcogito/cogito-v2-1-671b",
      "deepseek-ai/DeepSeek-R1",
      "deepseek-ai/DeepSeek-V3",
      "deepseek-ai/DeepSeek-V3-1",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "essentialai/Rnj-1-Instruct",
      "google/gemma-3n-E4B-it",
      "google/gemma-4-31B-it",
      "LiquidAI/LFM2-24B-A2B",
      "meta-llama/Llama-3.3-70B-Instruct-Turbo",
      "meta-llama/Meta-Llama-3-8B-Instruct-Lite",
      "MiniMaxAI/MiniMax-M2.5",
      "MiniMaxAI/MiniMax-M2.7",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.5",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "moonshotai/Kimi-K3",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "pearl-ai/gemma-4-31b-it",
      "Qwen/Qwen2.5-7B-Instruct-Turbo",
      "Qwen/Qwen3-235B-A22B-Instruct-2507-tput",
      "Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8",
      "Qwen/Qwen3-Coder-Next-FP8",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.5-9B",
      "Qwen/Qwen3.6-Plus",
      "Qwen/Qwen3.7-Max",
      "thinkingmachines/Inkling",
      "zai-org/GLM-5",
      "zai-org/GLM-5.1",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "tokengo",
    name: "TokenGo",
    apiKeyEnvVars: ["TOKENGO_API_KEY"],
    models: [
      "deepseek/deepseek-v3.1",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "minimax/minimax-m2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k3",
      "qwen/qwen3.5-397b-a17b",
      "z-ai/glm-5",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.3",
      "z-ai/glm-5.3-flash"
    ]
  },
  {
    id: "tokenrouter",
    name: "TokenRouter",
    apiKeyEnvVars: ["TOKENROUTER_API_KEY"],
    models: ["z-ai/glm-5.3-free"]
  },
  {
    id: "trustedrouter",
    name: "TrustedRouter",
    apiKeyEnvVars: ["TRUSTEDROUTER_API_KEY"],
    models: [
      "trustedrouter/auto",
      "trustedrouter/cheap",
      "trustedrouter/e2e",
      "trustedrouter/fast",
      "trustedrouter/synth",
      "trustedrouter/synth-code",
      "trustedrouter/zdr"
    ]
  },
  {
    id: "umans-ai",
    name: "Umans AI",
    apiKeyEnvVars: ["UMANS_AI_API_KEY"],
    models: [
      "umans-coder",
      "umans-deepseek-v4-flash-0731",
      "umans-deepseek-v4-pro-0813",
      "umans-flash",
      "umans-glm-5.2",
      "umans-kimi-k2.7",
      "umans-kimi-k3"
    ]
  },
  {
    id: "umans-ai-coding-plan",
    name: "Umans AI Coding Plan",
    apiKeyEnvVars: ["UMANS_AI_CODING_PLAN_API_KEY"],
    models: [
      "umans-coder",
      "umans-deepseek-v4-flash-0731",
      "umans-deepseek-v4-pro-0813",
      "umans-flash",
      "umans-glm-5.2",
      "umans-kimi-k2.7",
      "umans-kimi-k3",
      "umans-qwen3.6-35b-a3b"
    ]
  },
  {
    id: "unorouter",
    name: "UnoRouter",
    apiKeyEnvVars: ["UNOROUTER_API_KEY"],
    models: [
      "claude-haiku-4-5-20251001",
      "claude-opus-4-8",
      "claude-sonnet-5",
      "deepseek-v4-flash",
      "deepseek-v4-flash:free",
      "deepseek-v4-pro",
      "deepseek-v4-pro:free",
      "gemini-3.5-flash",
      "gemma-4-31b-it:free",
      "glm-4.5-flash:free",
      "glm-5.2",
      "glm-5.2:free",
      "gpt-5.2",
      "gpt-5.4",
      "gpt-5.4:free",
      "gpt-5.5",
      "gpt-5.5:free",
      "kimi-k2.6",
      "minimax-m2.7",
      "minimax-m2.7:free",
      "nemotron-3-ultra-550b-a55b:free",
      "qwen3.5-397b-a17b:free",
      "step-3.7-flash:free"
    ]
  },
  {
    id: "upstage",
    name: "Upstage",
    apiKeyEnvVars: ["UPSTAGE_API_KEY"],
    models: ["solar-mini", "solar-pro2", "solar-pro3", "solar-pro4"]
  },
  {
    id: "vancine",
    name: "Vancine",
    apiKeyEnvVars: ["VANCINE_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-flash-vision-exp",
      "deepseek-v4-pro",
      "glm-5.3",
      "glm-5.3-flash",
      "hy4-preview",
      "kimi-k3",
      "MiniMax-M3",
      "qwen3.8-flash",
      "qwen3.8-max"
    ]
  },
  {
    id: "vercel",
    name: "Vercel AI Gateway",
    apiKeyEnvVars: ["AI_GATEWAY_API_KEY"],
    models: [
      "alibaba/qwen-3-14b",
      "alibaba/qwen-3-235b",
      "alibaba/qwen-3-30b",
      "alibaba/qwen-3-32b",
      "alibaba/qwen-3.6-max-preview",
      "alibaba/qwen3-235b-a22b-thinking",
      "alibaba/qwen3-coder",
      "alibaba/qwen3-coder-30b-a3b",
      "alibaba/qwen3-coder-next",
      "alibaba/qwen3-coder-plus",
      "alibaba/qwen3-embedding-0.6b",
      "alibaba/qwen3-embedding-4b",
      "alibaba/qwen3-embedding-8b",
      "alibaba/qwen3-max",
      "alibaba/qwen3-max-preview",
      "alibaba/qwen3-max-thinking",
      "alibaba/qwen3-next-80b-a3b-instruct",
      "alibaba/qwen3-next-80b-a3b-thinking",
      "alibaba/qwen3-vl-235b-a22b-instruct",
      "alibaba/qwen3-vl-instruct",
      "alibaba/qwen3-vl-thinking",
      "alibaba/qwen3.5-flash",
      "alibaba/qwen3.5-plus",
      "alibaba/qwen3.6-27b",
      "alibaba/qwen3.6-plus",
      "alibaba/qwen3.7-flash",
      "alibaba/qwen3.7-max",
      "alibaba/qwen3.7-plus",
      "alibaba/qwen3.8-2.4t-a95b",
      "alibaba/qwen3.8-27b",
      "alibaba/qwen3.8-flash",
      "alibaba/qwen3.8-flash-next",
      "alibaba/qwen3.8-max",
      "alibaba/qwen3.8-max-0902",
      "alibaba/wan-v2.5-t2v-preview",
      "alibaba/wan-v2.6-i2v",
      "alibaba/wan-v2.6-i2v-flash",
      "alibaba/wan-v2.6-r2v",
      "alibaba/wan-v2.6-r2v-flash",
      "alibaba/wan-v2.6-t2v",
      "alibaba/wan-v2.7-r2v",
      "alibaba/wan-v2.7-t2v",
      "alibaba/wan-v3.0-video",
      "alibaba/wan-v3.0-video-prime",
      "amazon/nova-2-lite",
      "amazon/nova-lite",
      "amazon/nova-micro",
      "amazon/nova-pro",
      "amazon/titan-embed-text-v2",
      "anthropic/claude-3-haiku",
      "anthropic/claude-fable-5",
      "anthropic/claude-fable-5.1",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-opus-4.8-fast",
      "anthropic/claude-opus-5",
      "anthropic/claude-opus-5-fast",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "arcee-ai/trinity-large-thinking",
      "bfl/flux-2-flex",
      "bfl/flux-2-klein-4b",
      "bfl/flux-2-klein-9b",
      "bfl/flux-2-max",
      "bfl/flux-2-pro",
      "bfl/flux-3-video",
      "bfl/flux-kontext-max",
      "bfl/flux-kontext-pro",
      "bfl/flux-pro-1.0-fill",
      "bfl/flux-pro-1.1",
      "bfl/flux-pro-1.1-ultra",
      "bytedance/seed-1.6",
      "bytedance/seed-1.8",
      "bytedance/seedance-2.0",
      "bytedance/seedance-2.0-fast",
      "bytedance/seedance-2.0-mini",
      "bytedance/seedance-2.5",
      "bytedance/seedance-v1.0-pro",
      "bytedance/seedance-v1.0-pro-fast",
      "bytedance/seedance-v1.5-pro",
      "bytedance/seedream-4.0",
      "bytedance/seedream-4.5",
      "bytedance/seedream-5.0-lite",
      "bytedance/seedream-5.0-pro",
      "cohere/command-a",
      "cohere/embed-v4.0",
      "cohere/rerank-v3.5",
      "cohere/rerank-v4-fast",
      "cohere/rerank-v4-pro",
      "deepseek/deepseek-r1",
      "deepseek/deepseek-v3.1",
      "deepseek/deepseek-v3.1-terminus",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-thinking",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-flash-0731",
      "deepseek/deepseek-v4-flash-vision-exp",
      "deepseek/deepseek-v4-pro",
      "deepseek/deepseek-v4-pro-0813",
      "fish-audio/s1",
      "fish-audio/s1-free",
      "fish-audio/s2-pro",
      "fish-audio/s2-pro-free",
      "fish-audio/s2.1-pro",
      "fish-audio/s2.1-pro-free",
      "fish-audio/transcribe-1",
      "fish-audio/transcribe-1-free",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-image",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash",
      "google/gemini-3-pro-image",
      "google/gemini-3.1-flash-image",
      "google/gemini-3.1-flash-image-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-image",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.5-flash",
      "google/gemini-3.5-flash-lite",
      "google/gemini-3.5-transcribe",
      "google/gemini-3.5-transcribe-live",
      "google/gemini-3.6-flash",
      "google/gemini-3.7-flash",
      "google/gemini-3.8-flash",
      "google/gemini-embedding-001",
      "google/gemini-embedding-2",
      "google/gemini-omni-flash-preview",
      "google/gemma-4-26b-a4b-it",
      "google/gemma-4-31b-it",
      "google/text-embedding-005",
      "google/text-multilingual-embedding-002",
      "google/veo-3.0-fast-generate-001",
      "google/veo-3.0-generate-001",
      "google/veo-3.1-fast-generate-001",
      "google/veo-3.1-generate-001",
      "google/veo-3.1-lite-generate-001",
      "inception/mercury-2",
      "inception/mercury-coder-small",
      "inclusionai/ling-3.0-flash",
      "inclusionai/ling-3.0-flash-fin",
      "inclusionai/ling-3.0-flash-fin-free",
      "inclusionai/ling-3.0-flash-sante",
      "inclusionai/ling-3.0-flash-sante-free",
      "interfaze/interfaze-beta",
      "klingai/kling-v2.5-turbo-i2v",
      "klingai/kling-v2.5-turbo-t2v",
      "klingai/kling-v2.6-i2v",
      "klingai/kling-v2.6-motion-control",
      "klingai/kling-v2.6-t2v",
      "klingai/kling-v3.0-i2v",
      "klingai/kling-v3.0-motion-control",
      "klingai/kling-v3.0-t2v",
      "kwaipilot/kat-coder-air-v2.5",
      "kwaipilot/kat-coder-pro-v1",
      "kwaipilot/kat-coder-pro-v2",
      "kwaipilot/kat-coder-pro-v2.5",
      "meta/llama-3.1-70b",
      "meta/llama-3.1-8b",
      "meta/llama-3.3-70b",
      "meta/llama-4-maverick",
      "meta/llama-4-scout",
      "meta/muse-glimmer-30b",
      "meta/muse-image-1.0",
      "meta/muse-spark-1.1",
      "meta/muse-spark-1.2",
      "meta/muse-spark-1.2-contributor",
      "meta/muse-spark-1.3",
      "meta/muse-spark-1.3-contributor",
      "minimax/minimax-h3",
      "minimax/minimax-h3-max",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.1-lightning",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-highspeed",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "mistral/codestral",
      "mistral/codestral-embed",
      "mistral/devstral-2",
      "mistral/devstral-small-2",
      "mistral/ministral-14b",
      "mistral/ministral-3b",
      "mistral/ministral-8b",
      "mistral/mistral-embed",
      "mistral/mistral-large-3",
      "mistral/mistral-medium",
      "mistral/mistral-medium-3.5",
      "mistral/mistral-nemo",
      "mistral/mistral-small",
      "mistral/pixtral-12b",
      "moonshotai/kimi-k2",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k2.7-code-highspeed",
      "moonshotai/kimi-k3",
      "moonshotai/kimi-k3-fast",
      "morph/morph-v3-fast",
      "morph/morph-v3-large",
      "nvidia/nemotron-3-nano-30b-a3b",
      "nvidia/nemotron-3-super-120b-a12b",
      "nvidia/nemotron-3-ultra-550b-a55b",
      "nvidia/nemotron-3.5-lightning",
      "nvidia/nemotron-nano-12b-v2-vl",
      "nvidia/nemotron-nano-9b-v2",
      "openai/gpt-3.5-turbo",
      "openai/gpt-4-turbo",
      "openai/gpt-4.1",
      "openai/gpt-4.1-fast",
      "openai/gpt-4.1-mini",
      "openai/gpt-4.1-mini-fast",
      "openai/gpt-4.1-nano",
      "openai/gpt-4.1-nano-fast",
      "openai/gpt-4o",
      "openai/gpt-4o-fast",
      "openai/gpt-4o-mini",
      "openai/gpt-4o-mini-fast",
      "openai/gpt-4o-mini-transcribe",
      "openai/gpt-4o-transcribe",
      "openai/gpt-5",
      "openai/gpt-5-codex",
      "openai/gpt-5-fast",
      "openai/gpt-5-mini",
      "openai/gpt-5-mini-fast",
      "openai/gpt-5-nano",
      "openai/gpt-5-pro",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-max",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.1-thinking",
      "openai/gpt-5.1-thinking-fast",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-fast",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.3-codex-fast",
      "openai/gpt-5.4",
      "openai/gpt-5.4-fast",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-mini-fast",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-fast",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-luna-fast",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-sol-fast",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-terra-fast",
      "openai/gpt-6-astra",
      "openai/gpt-6-astra-fast",
      "openai/gpt-image-1",
      "openai/gpt-image-1-mini",
      "openai/gpt-image-1.5",
      "openai/gpt-image-2",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "openai/gpt-oss-safeguard-120b",
      "openai/gpt-oss-safeguard-20b",
      "openai/gpt-realtime-1.5",
      "openai/gpt-realtime-2",
      "openai/gpt-realtime-2.1",
      "openai/gpt-realtime-mini",
      "openai/gpt-realtime-whisper",
      "openai/o1",
      "openai/o3",
      "openai/o3-fast",
      "openai/o3-mini",
      "openai/o3-pro",
      "openai/o4-mini",
      "openai/o4-mini-fast",
      "openai/text-embedding-3-large",
      "openai/text-embedding-3-small",
      "openai/text-embedding-ada-002",
      "openai/tts-1",
      "openai/tts-1-hd",
      "openai/whisper-1",
      "perplexity/pplx-embed-v1-0.6b",
      "perplexity/pplx-embed-v1-4b",
      "perplexity/sonar",
      "perplexity/sonar-pro",
      "perplexity/sonar-reasoning-pro",
      "poolside/laguna-s-2.1",
      "poolside/laguna-s-2.1-free",
      "prodia/flux-fast-schnell",
      "quiverai/arrow-1.1",
      "recraft/recraft-v2",
      "recraft/recraft-v3",
      "recraft/recraft-v4",
      "recraft/recraft-v4-pro",
      "recraft/recraft-v4.1",
      "recraft/recraft-v4.1-pro",
      "recraft/recraft-v4.1-utility",
      "recraft/recraft-v4.1-utility-pro",
      "sakana/fugu-ultra",
      "sakana/namazu",
      "spacexai/grok-4.1-fast-non-reasoning",
      "spacexai/grok-4.1-fast-reasoning",
      "spacexai/grok-4.20-multi-agent",
      "spacexai/grok-4.20-multi-agent-beta",
      "spacexai/grok-4.20-non-reasoning",
      "spacexai/grok-4.20-non-reasoning-beta",
      "spacexai/grok-4.20-reasoning",
      "spacexai/grok-4.20-reasoning-beta",
      "spacexai/grok-4.3",
      "spacexai/grok-4.5",
      "spacexai/grok-4.6",
      "spacexai/grok-build-0.1",
      "spacexai/grok-imagine-image",
      "spacexai/grok-imagine-image-2.0",
      "spacexai/grok-imagine-video",
      "spacexai/grok-imagine-video-1.5",
      "spacexai/grok-imagine-video-1.5-preview",
      "spacexai/grok-stt",
      "spacexai/grok-tts",
      "spacexai/grok-voice-think-fast-1.0",
      "spacexai/grok-voice-think-fast-2.0",
      "stepfun/step-3.5-flash",
      "stepfun/step-3.7-flash",
      "tencent/hy-mt2-lite",
      "tencent/hy-mt2-plus",
      "tencent/hy-mt2-pro",
      "tencent/hy3",
      "tencent/hy4-preview",
      "thinkingmachines/inkling",
      "thinkingmachines/inkling-small",
      "voyage/rerank-2.5",
      "voyage/rerank-2.5-lite",
      "voyage/voyage-3-large",
      "voyage/voyage-3.5",
      "voyage/voyage-3.5-lite",
      "voyage/voyage-4",
      "voyage/voyage-4-large",
      "voyage/voyage-4-lite",
      "voyage/voyage-code-2",
      "voyage/voyage-code-3",
      "voyage/voyage-finance-2",
      "voyage/voyage-law-2",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "xiaomi/mimo-v2.5-pro-ultraspeed",
      "zai/glm-4.5",
      "zai/glm-4.5-air",
      "zai/glm-4.5v",
      "zai/glm-4.6",
      "zai/glm-4.7",
      "zai/glm-4.7-flash",
      "zai/glm-4.7-flashx",
      "zai/glm-5",
      "zai/glm-5-turbo",
      "zai/glm-5.1",
      "zai/glm-5.2",
      "zai/glm-5.2-fast",
      "zai/glm-5.3",
      "zai/glm-5.3-fast",
      "zai/glm-5.3-flash",
      "zai/glm-5.3-promo-50",
      "zai/glm-5v-turbo"
    ]
  },
  {
    id: "vivgrid",
    name: "Vivgrid",
    apiKeyEnvVars: ["VIVGRID_API_KEY"],
    models: [
      "deepseek-v3.2",
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "gemini-3.1-flash-lite-preview",
      "gemini-3.1-pro-preview",
      "gemini-3.7-flash",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "gpt-5-mini",
      "gpt-5.1-codex",
      "gpt-5.1-codex-max",
      "gpt-5.2-codex",
      "gpt-5.3-codex",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.5",
      "gpt-5.6-luna",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-6-astra",
      "kimi-k3"
    ]
  },
  {
    id: "volcengine",
    name: "Volcengine Ark",
    apiKeyEnvVars: ["ARK_API_KEY"],
    models: [
      "deepseek-v4-flash-ga-260731",
      "deepseek-v4-pro-ga-260813",
      "doubao-seed-1-6-251015",
      "doubao-seed-1-6-flash-250828",
      "doubao-seed-1-6-vision-250815",
      "doubao-seed-1-8-251228",
      "doubao-seed-2-0-code-preview-260215",
      "doubao-seed-2-0-lite-260428",
      "doubao-seed-2-0-mini-260428",
      "doubao-seed-2-0-pro-260215",
      "doubao-seed-2-1-pro-260628",
      "doubao-seed-2-1-turbo-260628",
      "doubao-seed-character-260628",
      "doubao-seed-evolving",
      "glm-5-2-260617"
    ]
  },
  {
    id: "volcengine-coding-plan",
    name: "Volcengine Ark Coding Plan",
    apiKeyEnvVars: ["ARK_CODING_PLAN_API_KEY"],
    models: [
      "deepseek-v4-flash",
      "deepseek-v4-pro",
      "doubao-seed-2.0-lite",
      "doubao-seed-2.1-turbo",
      "doubao-seed-evolving",
      "glm-5.3",
      "kimi-k2.7-code",
      "minimax-m3"
    ]
  },
  {
    id: "vultr",
    name: "Vultr",
    apiKeyEnvVars: ["VULTR_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V4-Flash",
      "MiniMaxAI/MiniMax-M2.7",
      "moonshotai/Kimi-K2.6",
      "nvidia/DeepSeek-V3.2-NVFP4",
      "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16",
      "nvidia/Nemotron-Cascade-2-30B-A3B",
      "Qwen/Qwen3.5-397B-A17B",
      "Qwen/Qwen3.6-27B",
      "XiaomiMiMo/MiMo-V2.5-Pro",
      "zai-org/GLM-5.2-FP8"
    ]
  },
  {
    id: "wafer.ai",
    name: "Wafer",
    apiKeyEnvVars: ["WAFER_API_KEY"],
    models: ["GLM-5.1", "GLM-5.2", "glm5.2-fast", "Kimi-K2.6", "MiniMax-M3"]
  },
  {
    id: "wandb",
    name: "Weights & Biases",
    apiKeyEnvVars: ["WANDB_API_KEY"],
    models: [
      "deepseek-ai/DeepSeek-V3.1",
      "deepseek-ai/DeepSeek-V4-Flash",
      "deepseek-ai/DeepSeek-V4-Flash-0731",
      "deepseek-ai/DeepSeek-V4-Pro",
      "deepseek-ai/DeepSeek-V4-Pro-0813",
      "google/gemma-4-31B-it",
      "ibm-granite/granite-4.1-8b",
      "ibm-granite/granite-4.2-8b",
      "JetBrains/Mellum2-12B-A2.5B-Instruct",
      "meta-llama/Llama-3.1-70B-Instruct",
      "meta-llama/Llama-3.1-8B-Instruct",
      "meta-llama/Llama-3.3-70B-Instruct",
      "MiniMaxAI/MiniMax-M3",
      "moonshotai/Kimi-K2.6",
      "moonshotai/Kimi-K2.7-Code",
      "nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B",
      "nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "OpenPipe/Qwen3-14B-Instruct",
      "Qwen/Qwen3-30B-A3B-Instruct-2507",
      "Qwen/Qwen3.5-35B-A3B",
      "Qwen/Qwen3.6-27B",
      "Qwen/Qwen3.6-35B-A3B",
      "Qwen/Qwen3.8-27B",
      "zai-org/GLM-5.2",
      "zai-org/GLM-5.3-Flash"
    ]
  },
  {
    id: "xai",
    name: "xAI",
    apiKeyEnvVars: ["XAI_API_KEY"],
    models: [
      "grok-4.20-0309-non-reasoning",
      "grok-4.20-0309-reasoning",
      "grok-4.20-multi-agent-0309",
      "grok-4.3",
      "grok-4.5",
      "grok-4.6",
      "grok-build-0.1",
      "grok-imagine-image",
      "grok-imagine-image-2.0",
      "grok-imagine-image-quality",
      "grok-imagine-video",
      "grok-imagine-video-1.5"
    ]
  },
  {
    id: "xiaomi",
    name: "Xiaomi",
    apiKeyEnvVars: ["XIAOMI_API_KEY"],
    models: [
      "mimo-v2-flash",
      "mimo-v2-omni",
      "mimo-v2-pro",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "mimo-v2.5-pro-ultraspeed"
    ]
  },
  {
    id: "xiaomi-token-plan-cn",
    name: "Xiaomi Token Plan (China)",
    apiKeyEnvVars: ["XIAOMI_API_KEY"],
    models: [
      "mimo-v2-pro",
      "mimo-v2-tts",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "mimo-v2.5-tts",
      "mimo-v2.5-tts-voiceclone",
      "mimo-v2.5-tts-voicedesign"
    ]
  },
  {
    id: "xiaomi-token-plan-ams",
    name: "Xiaomi Token Plan (Europe)",
    apiKeyEnvVars: ["XIAOMI_API_KEY"],
    models: [
      "mimo-v2-pro",
      "mimo-v2-tts",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "mimo-v2.5-tts",
      "mimo-v2.5-tts-voiceclone",
      "mimo-v2.5-tts-voicedesign"
    ]
  },
  {
    id: "xiaomi-token-plan-sgp",
    name: "Xiaomi Token Plan (Singapore)",
    apiKeyEnvVars: ["XIAOMI_API_KEY"],
    models: [
      "mimo-v2-pro",
      "mimo-v2-tts",
      "mimo-v2.5",
      "mimo-v2.5-pro",
      "mimo-v2.5-tts",
      "mimo-v2.5-tts-voiceclone",
      "mimo-v2.5-tts-voicedesign"
    ]
  },
  {
    id: "xpersona",
    name: "Xpersona",
    apiKeyEnvVars: ["XPERSONA_API_KEY"],
    models: [
      "claude-fable-5",
      "claude-haiku-4-5",
      "claude-opus-4-8",
      "claude-sonnet-4-6",
      "gemini-3.5-flash",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.5",
      "gpt-5.6",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "xpersona-frieren-coder",
      "xpersona-gpt-5.5"
    ]
  },
  {
    id: "zai",
    name: "Z.AI",
    apiKeyEnvVars: ["ZHIPU_API_KEY"],
    models: [
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-flash",
      "glm-4.5v",
      "glm-4.6",
      "glm-4.6v",
      "glm-4.7",
      "glm-4.7-flash",
      "glm-4.7-flashx",
      "glm-5",
      "glm-5-turbo",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5v-turbo"
    ]
  },
  {
    id: "zai-coding-plan",
    name: "Z.AI Coding Plan",
    apiKeyEnvVars: ["ZHIPU_API_KEY"],
    models: [
      "glm-4.7",
      "glm-5-turbo",
      "glm-5.2",
      "glm-5.2-highspeed",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5.3-highspeed"
    ]
  },
  {
    id: "zeldoc",
    name: "Zeldoc",
    apiKeyEnvVars: ["ZELDOC_API_KEY"],
    models: ["zdev"]
  },
  {
    id: "zenifra",
    name: "Zenifra",
    apiKeyEnvVars: ["ZENIFRA_AI_KEY"],
    models: ["alibaba/qwen3.6-35b-a3b"]
  },
  {
    id: "zenmux",
    name: "ZenMux",
    apiKeyEnvVars: ["ZENMUX_API_KEY"],
    models: [
      "anthropic/claude-3.5-haiku",
      "anthropic/claude-3.7-sonnet",
      "anthropic/claude-fable-5",
      "anthropic/claude-haiku-4.5",
      "anthropic/claude-opus-4",
      "anthropic/claude-opus-4.1",
      "anthropic/claude-opus-4.5",
      "anthropic/claude-opus-4.6",
      "anthropic/claude-opus-4.7",
      "anthropic/claude-opus-4.8",
      "anthropic/claude-sonnet-4",
      "anthropic/claude-sonnet-4.5",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-sonnet-5",
      "anthropic/claude-sonnet-5-free",
      "baidu/ernie-5.0-thinking-preview",
      "deepseek/deepseek-chat",
      "deepseek/deepseek-v3.2",
      "deepseek/deepseek-v3.2-exp",
      "deepseek/deepseek-v4-flash",
      "deepseek/deepseek-v4-pro",
      "google/gemini-2.5-flash",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
      "google/gemini-3-flash-preview",
      "google/gemini-3.1-flash-lite",
      "google/gemini-3.1-flash-lite-preview",
      "google/gemini-3.1-pro-preview",
      "google/gemini-3.5-flash",
      "inclusionai/ling-1t",
      "inclusionai/ring-1t",
      "inclusionai/ring-2.6-1t",
      "kuaishou/kat-coder-pro-v2",
      "minimax/minimax-m2",
      "minimax/minimax-m2.1",
      "minimax/minimax-m2.5",
      "minimax/minimax-m2.5-lightning",
      "minimax/minimax-m2.7",
      "minimax/minimax-m2.7-highspeed",
      "minimax/minimax-m3",
      "moonshotai/kimi-k2-0905",
      "moonshotai/kimi-k2-thinking",
      "moonshotai/kimi-k2-thinking-turbo",
      "moonshotai/kimi-k2.5",
      "moonshotai/kimi-k2.6",
      "moonshotai/kimi-k2.7-code",
      "moonshotai/kimi-k2.7-code-free",
      "moonshotai/kimi-k3",
      "moonshotai/kimi-k3-free",
      "openai/gpt-5",
      "openai/gpt-5-codex",
      "openai/gpt-5.1",
      "openai/gpt-5.1-chat",
      "openai/gpt-5.1-codex",
      "openai/gpt-5.1-codex-mini",
      "openai/gpt-5.2",
      "openai/gpt-5.2-codex",
      "openai/gpt-5.2-pro",
      "openai/gpt-5.3-chat",
      "openai/gpt-5.3-codex",
      "openai/gpt-5.4",
      "openai/gpt-5.4-mini",
      "openai/gpt-5.4-nano",
      "openai/gpt-5.4-pro",
      "openai/gpt-5.5",
      "openai/gpt-5.5-instant",
      "openai/gpt-5.5-pro",
      "openai/gpt-5.6-luna",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "qwen/qwen3-coder-plus",
      "qwen/qwen3-max",
      "qwen/qwen3.5-flash",
      "qwen/qwen3.5-plus",
      "qwen/qwen3.6-plus",
      "qwen/qwen3.7-max",
      "qwen/qwen3.7-plus",
      "sapiens-ai/agnes-1.5-lite",
      "sapiens-ai/agnes-1.5-pro",
      "stepfun/step-3",
      "stepfun/step-3.5-flash",
      "stepfun/step-3.7-flash",
      "stepfun/step-3.7-flash-free",
      "tencent/hy3-preview",
      "volcengine/doubao-seed-1.8",
      "volcengine/doubao-seed-2.0-code",
      "volcengine/doubao-seed-2.0-lite",
      "volcengine/doubao-seed-2.0-mini",
      "volcengine/doubao-seed-2.0-pro",
      "volcengine/doubao-seed-code",
      "x-ai/grok-4",
      "x-ai/grok-4-fast",
      "x-ai/grok-4.1-fast",
      "x-ai/grok-4.1-fast-non-reasoning",
      "x-ai/grok-4.2-fast",
      "x-ai/grok-4.2-fast-non-reasoning",
      "x-ai/grok-4.3",
      "x-ai/grok-4.5",
      "x-ai/grok-build-0.1",
      "x-ai/grok-code-fast-1",
      "xiaomi/mimo-v2-flash",
      "xiaomi/mimo-v2-omni",
      "xiaomi/mimo-v2-pro",
      "xiaomi/mimo-v2.5",
      "xiaomi/mimo-v2.5-pro",
      "z-ai/glm-4.5",
      "z-ai/glm-4.5-air",
      "z-ai/glm-4.6",
      "z-ai/glm-4.6v",
      "z-ai/glm-4.6v-flash",
      "z-ai/glm-4.6v-flash-free",
      "z-ai/glm-4.7",
      "z-ai/glm-4.7-flash-free",
      "z-ai/glm-4.7-flashx",
      "z-ai/glm-5",
      "z-ai/glm-5-turbo",
      "z-ai/glm-5.1",
      "z-ai/glm-5.2",
      "z-ai/glm-5.2-free",
      "z-ai/glm-5v-turbo"
    ]
  },
  {
    id: "zhipuai",
    name: "Zhipu AI",
    apiKeyEnvVars: ["ZHIPU_API_KEY"],
    models: [
      "glm-4.5",
      "glm-4.5-air",
      "glm-4.5-flash",
      "glm-4.5v",
      "glm-4.6",
      "glm-4.6v",
      "glm-4.7",
      "glm-4.7-flash",
      "glm-4.7-flashx",
      "glm-5",
      "glm-5.1",
      "glm-5.2",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5v-turbo"
    ]
  },
  {
    id: "zhipuai-coding-plan",
    name: "Zhipu AI Coding Plan",
    apiKeyEnvVars: ["ZHIPU_API_KEY"],
    models: [
      "glm-4.6v",
      "glm-4.7",
      "glm-5-turbo",
      "glm-5.1",
      "glm-5.2",
      "glm-5.2-highspeed",
      "glm-5.3",
      "glm-5.3-flash",
      "glm-5.3-highspeed",
      "glm-5v-turbo"
    ]
  }
] as const satisfies readonly MastraProviderCatalogEntry[];

export type MastraProviderId = (typeof MASTRA_PROVIDER_CATALOG)[number]["id"];

export const MASTRA_PROVIDER_IDS = MASTRA_PROVIDER_CATALOG.map(
  (p) => p.id
) as readonly MastraProviderId[];

const byId = new Map(MASTRA_PROVIDER_CATALOG.map((p) => [p.id, p]));

export function getMastraProvider(id: string): MastraProviderCatalogEntry | undefined {
  return byId.get(id as MastraProviderId);
}

export function isMastraProviderId(id: string): id is MastraProviderId {
  return byId.has(id as MastraProviderId);
}

/** Capability flags for a model. null = unknown (not in models.dev, custom, free-typed). */
export type MastraModelCapability = {
  toolCall: boolean | null;
  structuredOutput: boolean | null;
};

export const MASTRA_MODEL_CAPABILITIES = {
  "302ai/chatgpt-4o-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-3-5-haiku-20241022": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-3-5-haiku-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-opus-4-1-20250805-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-opus-4-20250514": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-opus-4-5": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-opus-4-5-20251101-thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-opus-4-6": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-opus-4-6-thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-20250514": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-5": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-5-20250929-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/claude-sonnet-4-6-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/deepseek-chat": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/deepseek-reasoner": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/deepseek-v3.2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/doubao-seed-1-6-thinking-250715": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/doubao-seed-1-6-vision-250815": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/doubao-seed-1-8-251215": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/doubao-seed-code-preview-251028": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/gemini-2.0-flash-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "302ai/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "302ai/gemini-2.5-flash-lite-preview-09-2025": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-2.5-flash-nothink": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-2.5-flash-preview-09-2025": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "302ai/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "302ai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-4.5-air": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/glm-4.5-airx": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/glm-4.5-x": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/glm-4.5v": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-4.7-flashx": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/glm-for-coding": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.1-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.2-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.4-mini-2026-03-17": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "302ai/gpt-5.4-nano-2026-03-17": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/gpt-5.4-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/grok-4-1-fast-non-reasoning": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/grok-4-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/grok-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/grok-4.20-beta-0309-non-reasoning": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/grok-4.20-beta-0309-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/grok-4.20-multi-agent-beta-0309": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/kimi-k2-0905-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/kimi-k2-thinking-turbo": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/MiniMax-M1": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/MiniMax-M2.7-highspeed": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/ministral-14b-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/mistral-large-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/qwen-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/qwen-max-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/qwen-plus": {
    toolCall: null,
    structuredOutput: null
  },
  "302ai/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "302ai/qwen3-max-2025-09-23": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-3-7-sonnet-20250219": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-20250514": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-sonnet-4-20250514": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/deepseek-ai/DeepSeek-V3.1-Terminus": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "abacus/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: null
  },
  "abacus/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "abacus/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "abacus/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "abacus/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.1-chat-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.2-chat-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.3-chat-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.3-codex-xhigh": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/grok-4-0709": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/kimi-k2-turbo-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/llama-3.3-70b-versatile": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/meta-llama/Meta-Llama-3.1-8B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/meta-llama/Meta-Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/qwen-2.5-coder-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/Qwen/Qwen2.5-72B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/Qwen/Qwen3-Coder-480B-A35B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/Qwen/QwQ-32B": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/route-llm": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/zai-org/GLM-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/zai-org/GLM-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/zai-org/GLM-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: null
  },
  "abacus/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "abacus/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "abliteration-ai/abliterated-model": {
    toolCall: true,
    structuredOutput: false
  },
  "abliteration-ai/abliterated-model-large": {
    toolCall: true,
    structuredOutput: true
  },
  "abliteration-ai/abliterated-model-large-v2": {
    toolCall: true,
    structuredOutput: true
  },
  "above/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "above/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "above/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "above/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "above/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "above/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "above/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "above/mimo-v2.5-pro-ultraspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "above/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "agentrouter/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "agentrouter/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "agentrouter/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "agnes/agnes-2.0-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "agnes/agnes-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "agnes/agnes-2.5-pro-alpha": {
    toolCall: true,
    structuredOutput: true
  },
  "ai-router/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "ai-router/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "ai-router/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "ai-router/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "ai-router/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/deepseek-ai/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/deepseek-ai/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/motif-technologies/motif-3": {
    toolCall: false,
    structuredOutput: false
  },
  "aiand/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/qwen/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "aiand/zai-org/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "aixy/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/deepseek-v4-flash-0731-284b": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/gemma4-26b": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/kimi-k2.7-code-1100b": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/mistral4-119b": {
    toolCall: true,
    structuredOutput: null
  },
  "aki-io/qwen3.6-35b": {
    toolCall: true,
    structuredOutput: true
  },
  "aki-io/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qvq-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-mt-plus": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba/qwen-mt-turbo": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba/qwen-omni-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-omni-turbo-realtime": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-plus-character-ja": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-vl-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen-vl-ocr": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba/qwen-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-14b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-32b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-72b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-omni-7b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-vl-72b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen2-5-vl-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-14b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-asr-flash": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-livetranslate-flash-realtime": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-omni-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-omni-flash-realtime": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-vl-235b-a22b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-vl-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba/qwq-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-llama-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-llama-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-qwen-1-5b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-qwen-14b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-qwen-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-r1-distill-qwen-7b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-v3-1": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-v3-2-exp": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "alibaba-cn/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "alibaba-cn/kimi/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/MiniMax/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/moonshot-kimi-k2-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "alibaba-cn/qvq-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-deep-research": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-doc-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-long": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-math-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-math-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-mt-plus": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-cn/qwen-mt-turbo": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-cn/qwen-omni-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-omni-turbo-realtime": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-plus-character": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-vl-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen-vl-ocr": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-cn/qwen-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-14b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-32b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-72b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-coder-32b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-coder-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-math-72b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-math-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-omni-7b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-vl-72b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen2-5-vl-7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-14b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-asr-flash": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-omni-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-omni-flash-realtime": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-vl-235b-a22b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-vl-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/qwq-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/qwq-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-cn/siliconflow/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/siliconflow/deepseek-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/siliconflow/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/siliconflow/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-cn/tongyi-intent-detect-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-coding-plan/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-coding-plan/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3-max-2026-01-23": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-coding-plan/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-coding-plan-cn/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3-max-2026-01-23": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-coding-plan-cn/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-coding-plan-cn/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-token-plan/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/happyhorse-1.1-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/happyhorse-1.1-r2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/happyhorse-1.1-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-token-plan/qwen-image-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/qwen-image-2.0-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/qwen3.8-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan/wan2.7-image": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan/wan2.7-image-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/happyhorse-1.1-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/happyhorse-1.1-r2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/happyhorse-1.1-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/qwen-image-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/qwen-image-2.0-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/qwen3.8-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "alibaba-token-plan-cn/wan2.7-image": {
    toolCall: false,
    structuredOutput: null
  },
  "alibaba-token-plan-cn/wan2.7-image-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "ambient/ambient/large": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/zai-org/GLM-5.1-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "ambient/zai-org/GLM-5.2-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "amd/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "amd/DeepSeek-V4-Flash-Vision-Exp": {
    toolCall: true,
    structuredOutput: true
  },
  "amd/MiniCPM5-1B": {
    toolCall: true,
    structuredOutput: null
  },
  "amd/Qwen3.8-Flash-Next": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/cohere/command-r-plus-08-2024": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/deepseek/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/google/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/mistralai/devstral-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/mistralai/mistral-large-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "anyapi/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "anyapi/perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "anyapi/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "anyapi/xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "arcee/deepseek/deepseek-v4-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "arcee/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "arcee/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "arcee/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "arcee/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: null
  },
  "arcee/trinity-large-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "arcee/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "atomic-chat/gemma-4-E4B-it-IQ4_XS": {
    toolCall: false,
    structuredOutput: null
  },
  "atomic-chat/gemma-4-E4B-it-MLX-4bit": {
    toolCall: false,
    structuredOutput: null
  },
  "atomic-chat/Meta-Llama-3_1-8B-Instruct-GGUF": {
    toolCall: true,
    structuredOutput: null
  },
  "atomic-chat/Qwen3_5-9B-MLX-4bit": {
    toolCall: true,
    structuredOutput: null
  },
  "atomic-chat/Qwen3_5-9B-Q4_K_M": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "auriko/minimax-m2-7": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/minimax-m2-7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "auriko/qwen-3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "bailing/Ling-1T": {
    toolCall: true,
    structuredOutput: null
  },
  "bailing/Ring-1T": {
    toolCall: false,
    structuredOutput: null
  },
  "baseten/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "baseten/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "baseten/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/nvidia/Nemotron-120B-A12B": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.2-Fast": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.3-Fast": {
    toolCall: true,
    structuredOutput: true
  },
  "baseten/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/Qwen/Qwen3.8-27B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "berget/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "blueclaw/Qwen/Qwen3.6-35B-A3B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "blueclaw/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "bothub/gemma-4-31b-it:free": {
    toolCall: true,
    structuredOutput: true
  },
  "bothub/nemotron-3-ultra-550b-a55b:free": {
    toolCall: true,
    structuredOutput: null
  },
  "cerebras/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "cerebras/qwen-3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/llama-4-maverick-17b-128e-instruct-fp8": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3-coder-480b-a35b-instruct-int4-mixed-ar": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/qwen3.6-max": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "hyper/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hyper/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "chutes/deepseek-ai/DeepSeek-V3.2-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/deepseek-ai/DeepSeek-V4-Flash-0731-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/google/gemma-4-31B-turbo-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/moonshotai/Kimi-K2.6-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/moonshotai/Kimi-K3-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/Nemotron-3-Nano-Omni-30B-TEE": {
    toolCall: false,
    structuredOutput: null
  },
  "chutes/Qwen/Qwen3-235B-A22B-Thinking-2507-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/Qwen/Qwen3-32B-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/Qwen/Qwen3.5-397B-A17B-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/Qwen/Qwen3.6-27B-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/Qwen/Qwen3.8-27B-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/unsloth/Mistral-Nemo-Instruct-2407-TEE": {
    toolCall: false,
    structuredOutput: null
  },
  "chutes/zai-org/GLM-5.1-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "chutes/zai-org/GLM-5.2-TEE": {
    toolCall: true,
    structuredOutput: true
  },
  "clarifai/arcee_ai/AFM/models/trinity-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/clarifai/main/models/mm-poly-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "clarifai/deepseek-ai/deepseek-ocr/models/DeepSeek-OCR": {
    toolCall: false,
    structuredOutput: null
  },
  "clarifai/minimaxai/chat-completion/models/MiniMax-M2_5-high-throughput": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/mistralai/completion/models/Ministral-3-14B-Reasoning-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/mistralai/completion/models/Ministral-3-3B-Reasoning-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/moonshotai/chat-completion/models/Kimi-K2_6": {
    toolCall: true,
    structuredOutput: true
  },
  "clarifai/openai/chat-completion/models/gpt-oss-120b-high-throughput": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/openai/chat-completion/models/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/qwen/qwenCoder/models/Qwen3-Coder-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "clarifai/qwen/qwenLM/models/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "clarifai/qwen/qwenLM/models/Qwen3-30B-A3B-Thinking-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "claudinio/claudinio": {
    toolCall: true,
    structuredOutput: null
  },
  "claudinio/claudius": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "cline-pass/cline-pass/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "cline-pass/cline-pass/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudferro-sherlock/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "cloudferro-sherlock/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudferro-sherlock/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudferro-sherlock/speakleash/Bielik-11B-v2.6-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudferro-sherlock/speakleash/Bielik-11B-v3.0-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/aisingapore/gemma-sea-lion-v4-27b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/deepseek-ai/deepseek-r1-distill-qwen-32b": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/deepseek-ai/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/deepseek-ai/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/ibm-granite/granite-4.0-h-micro": {
    toolCall: true,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-3.1-8b-instruct-fp8": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-3.2-11b-vision-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-3.2-1b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-3.3-70b-instruct-fp8-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-4-scout-17b-16e-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/meta/llama-guard-3-8b": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/mistralai/mistral-small-3.1-24b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/nvidia/nemotron-3-120b-a12b": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/qwen/qwen2.5-coder-32b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/qwen/qwen3-30b-a3b-fp8": {
    toolCall: true,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/qwen/qwq-32b": {
    toolCall: false,
    structuredOutput: false
  },
  "cloudflare-workers-ai/@cf/zai-org/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/zai-org/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "cloudflare-workers-ai/@cf/zai-org/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "coralbricks/glm-5.3-fp4": {
    toolCall: true,
    structuredOutput: true
  },
  "coralbricks/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "coralbricks/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/apertus-70b": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/claude-4-5-sonnet": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-4-6-sonnet": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-opus4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-opus4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-opus4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-opus4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/codestral-2508": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: null
  },
  "cortecs/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "cortecs/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/devstral-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemma-3-27b-it": {
    toolCall: false,
    structuredOutput: true
  },
  "cortecs/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-4.1": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-4o": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-5": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-5-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-5-nano": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "cortecs/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/gpt-oss-safeguard-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/hermes-4-405b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/llama-3.1-405b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minicpm-v-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minimax-m2": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minimax-m2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/ministral-14b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/ministral-3b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/ministral-8b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-7b-instruct-v0.2": {
    toolCall: false,
    structuredOutput: false
  },
  "cortecs/mistral-7b-instruct-v0.3": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-large-2402": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-large-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-medium-3.5": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-nemo-instruct-2407": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-small-2503": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-small-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mistral-small-3.2-24b-instruct-2506": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/mixtral-8x7B-instruct-v0.1": {
    toolCall: false,
    structuredOutput: true
  },
  "cortecs/nemotron-nano-v2-12b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/nova-2-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/nova-lite-v1": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/nova-micro-v1": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/nova-pro-v1": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/nvidia-nemotron-3-nano-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/pixtral-12b-2409": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/pixtral-large-2502": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "cortecs/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3-30b-a3b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3-32b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3-vl-235b-a22b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: null
  },
  "cortecs/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: null
  },
  "cortecs/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3.8-flash-next": {
    toolCall: true,
    structuredOutput: true
  },
  "cortecs/qwen3guard-gen-0.6b": {
    toolCall: false,
    structuredOutput: false
  },
  "cortecs/qwen3guard-gen-8b": {
    toolCall: false,
    structuredOutput: false
  },
  "cortecs/voxtral-small-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "crof/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/greg-1-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "crof/greg-2-super": {
    toolCall: false,
    structuredOutput: null
  },
  "crof/greg-2-ultra": {
    toolCall: false,
    structuredOutput: null
  },
  "crof/greg-rp": {
    toolCall: false,
    structuredOutput: null
  },
  "crof/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/kimi-k3-eco": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "crof/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "crof/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: null
  },
  "crossmodel/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/gemini/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/moonshot/kimi-k2.5": {
    toolCall: null,
    structuredOutput: null
  },
  "crossmodel/moonshot/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/moonshot/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/moonshot/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/qwen/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/tencent/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/tencent/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "crossmodel/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/x-ai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "crossmodel/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "crusoe/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "crusoe/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "crusoe/nvidia/Nemotron-3-Nano-Omni-Reasoning-30B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "crusoe/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "crusoe/zai/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "crusoe/zai/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "drun/public/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "drun/public/deepseek-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "drun/public/minimax-m25": {
    toolCall: true,
    structuredOutput: null
  },
  "daoxe/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "daoxe/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "daoxe/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "daoxe/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "daoxe/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "daoxe/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "daoxe/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "daoxe/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "daoxe/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-opus-4-1": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "databricks/databricks-gemini-2-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gemini-2-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gemini-3-1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gemini-3-1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gemini-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gemini-3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-glm-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-4": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-5": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "databricks/databricks-kimi-k2-7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/ByteDance/Seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/ByteDance/Seed-2.0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/ByteDance/Seed-2.0-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/google/gemma-4-26B-A4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/google/gemma-4-E4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/meta-llama/Llama-3.3-70B-Instruct-Turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": {
    toolCall: false,
    structuredOutput: true
  },
  "deepinfra/meta-llama/Llama-4-Scout-17B-16E-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "deepinfra/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "deepinfra/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/nvidia/Llama-3.3-Nemotron-Super-49B-v1.5": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/nvidia/Nemotron-3-Nano-30B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "deepinfra/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-30B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-Coder-480B-A35B-Instruct-Turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-Max": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-Next-80B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.5-122B-A10B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.5-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.7-Max": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.8-2.4T-A95B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/Qwen/Qwen3.8-Max": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/stepfun-ai/Step-3.7-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "deepinfra/tencent/Hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "deepinfra/thinkingmachines/Inkling-Small": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/XiaomiMiMo/MiMo-V2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/XiaomiMiMo/MiMo-V2.5-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-4.7-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "deepinfra/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/claude-sonnet-5": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/codestral-2508": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/custom": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/deepseek-v4-flash-vision-exp": {
    toolCall: null,
    structuredOutput: null
  },
  "llmgateway/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/devstral-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/ernie-4.5-vl-424b-a47b": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/fugu-ultra": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-4-32b-0414-128k": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.5-airx": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-4.5-x": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-4.5v": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.6v-flashx": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/gpt-4": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-4o-mini-transcribe": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-4o-transcribe": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-20-beta-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-20-beta-0309-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-20-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-20-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-4-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/grok-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/grok-build-0-1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/kimi-k2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/kimi-k3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/llama-3-70b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/llama-3.1-70b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/llama-3.2-11b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/llama-4-maverick-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/llama-4-scout-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2.1-lightning": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/minimax-text-01": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway/ministral-14b-2512": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/ministral-3b-2512": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/ministral-8b-2512": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway/mistral-large-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/mistral-large-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/mistral-small-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/nemotron-3-ultra-550b": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen-coder-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen-max": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen-omni-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen-plus-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-235b-a22b-fp8": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-vl-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway/qwen35-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/seed-1-6-250615": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/seed-1-6-250915": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/seed-1-6-flash-250715": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/seed-1-8-251228": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway/sonar": {
    toolCall: false,
    structuredOutput: null
  },
  "llmgateway/sonar-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "llmgateway/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/alibaba-qwen3-32b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/all-mini-lm-l6-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-3-opus": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-3.5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-3.5-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-3.7-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-4.1-opus": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-4.5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-4.5-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-4.6-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-5-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-fable-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-4": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/anthropic-claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/arcee-trinity-large-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/bge-m3": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/bge-reranker-v2-m3": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/deepseek-3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/deepseek-4-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/deepseek-r1-distill-llama-70b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/deepseek-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/e5-large-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/fal-ai/elevenlabs/tts/multilingual-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/fal-ai/fast-sdxl": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/fal-ai/flux/schnell": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/fal-ai/stable-audio-25/text-to-audio": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/gte-large-en-v1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/llama-4-maverick": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/llama3-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/llama3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/ministral-3-8b-instruct-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/mistral-3-14B": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/mistral-7b-instruct-v0.3": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/mistral-nemo-instruct-2407": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/multi-qa-mpnet-base-dot-v1": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/nemotron-3-nano-30b": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/nemotron-3-nano-omni": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/nemotron-3-ultra-550b": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/nemotron-nano-12b-v2-vl": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/nvidia-nemotron-3-super-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/openai-gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/openai-gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-image-1": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/openai-gpt-image-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/openai-gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/openai-gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-o1": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-o3": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/openai-o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/qwen-2.5-14b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/qwen3-embedding-0.6b": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/qwen3-tts-voicedesign": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "digitalocean/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "digitalocean/stable-diffusion-3.5-large": {
    toolCall: false,
    structuredOutput: null
  },
  "digitalocean/wan2-2-t2v-a14b": {
    toolCall: false,
    structuredOutput: null
  },
  "dinference/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "dinference/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "dinference/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "dinference/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "dinference/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "dinference/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ebcloud/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ebcloud/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "ebcloud/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "ebcloud/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "echo/echo": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/amazon/moonshot.kimi-k2-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/amazon/moonshotai.kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/amazon/zai.glm-4.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/amazon/zai.glm-4.7-flash@us": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-fable-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-opus-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/anthropic/claude-sonnet-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/azure/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/azure/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/azure/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/azure/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cerebras/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cloudflare/@cf/aisingapore/gemma-sea-lion-v4-27b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/cloudflare/@cf/deepseek-ai/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cloudflare/@cf/deepseek-ai/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cloudflare/@cf/meta/llama-guard-3-8b": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/cloudflare/@cf/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/cloudflare/@cf/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/cloudflare/@cf/qwen/qwen2.5-coder-32b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/cloudflare/@cf/zai-org/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cohere/command-a-03-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cohere/command-r-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cohere/command-r-plus-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/cohere/command-r7b-12-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/databricks/databricks-deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-gpt-oss-120b@eu": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-gpt-oss-20b@eu": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/databricks/databricks-inkling": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/deepinfra/ByteDance/Seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/ByteDance/Seed-2.0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/deepinfra/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/deepinfra/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/deepinfra/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/meta-llama/Llama-3.2-11B-Vision-Instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/deepinfra/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/meta-llama/Llama-Guard-3-8B": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/deepinfra/meta-models/Muse-Glimmer-30B": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/nvidia/Llama-3.1-Nemotron-70B-Instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/deepinfra/nvidia/Nemotron-3-Nano-30B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/stepfun-ai/Step-3.5-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/stepfun-ai/Step-3.7-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/tencent/Hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/thinkingmachines/Inkling-Small": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepinfra/zai-org/GLM-4.7-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/fireworks_ai/accounts/fireworks/models/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/fireworks_ai/accounts/fireworks/models/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/fireworks_ai/accounts/fireworks/models/inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/fireworks_ai/accounts/fireworks/models/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/fireworks_ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/flexai/deepseek-v4-flash-0731": {
    toolCall: null,
    structuredOutput: null
  },
  "edenai/flexai/gpt-oss-120b": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/flexai/gpt-oss-20b": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/flexai/Muse-Glimmer-30B": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/flexai/Nemotron-3-Super-120B-A12B": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/flexai/Step-3.7-Flash": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-flash-lite-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/google/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/groq/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/groq/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/ionos/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/ionos/openai/gpt-oss-120b": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/minimax/MiniMax-M2": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/minimax/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/minimax/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/minimax/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/minimax/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/codestral-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/devstral-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/devstral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/magistral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-large-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-large-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-medium-2505": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-medium-2604": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-small-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/mistral-small-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/mistral/voxtral-small-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/moonshot/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/moonshot/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/moonshot/kimi-k2.7-code-highspeed": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/moonshot/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/nebius/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/nebius/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/nebius/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/nebius/nvidia/Nemotron-3-Ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/nebius/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-mini-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/gpt-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/ovhcloud/gpt-oss-120b": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/ovhcloud/gpt-oss-20b": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/perplexityai/sonar": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/perplexityai/sonar-deep-research": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/perplexityai/sonar-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/perplexityai/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/qwen/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen-max": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/qwen/qwen-vl-max": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/qwen/qwen-vl-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/qwen/qwen3-235b-a22b-instruct-2507": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-coder-480b-a35b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/qwen/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-coder-next@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-max@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/qwen/qwq-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "edenai/scaleway/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/scaleway/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/scaleway/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/tensorx/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/tensorx/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/tensorx/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/together_ai/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/meta-models/Muse-Glimmer-30B": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/together_ai/thinkingmachines/Inkling-Small": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/vertex/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-flash-lite-image": {
    toolCall: false,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-flash-lite@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-flash-lite@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash-lite@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash-lite@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.5-flash@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.6-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.6-flash@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.7-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.7-flash@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.8-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-3.8-flash@us": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/vertex/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-4.20-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-4.20-0309-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/xai/grok-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/zai/glm-4.6v": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/zai/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "edenai/zai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "edenai/zai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/deepseek-v3-2": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/fugu-ultra-v1-0": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/fugu-ultra-v1-1": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/gemma-4-26b-a4b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-4-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-4-6v-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-4-7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-5-3": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/glm-5-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/kimi-k2-6": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/kimi-k2-7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/kimi-k2-7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/mimo-v2-5": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/mimo-v2-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/minimax-m2-7": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/minimax-m2-7-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/mistral-small-4": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/muse-spark-1-1": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/muse-spark-1-2": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/muse-spark-1-3": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-4b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-5-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-6-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-8-max-0902": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/seed-2-0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/seed-2-0-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/seed-2-0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/seed-2-0-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/seed-2-1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/step-3-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/step-3-5-flash-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "empiriolabs/step-3-7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/evroc/roc": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/google/gemma-4-26B-A4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/intfloat/multilingual-e5-large-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/KBLab/kb-whisper-large": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/mistralai/Mistral-Medium-3.5-128B": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/mistralai/Voxtral-Small-24B-2507": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/nvidia/Llama-3.3-70B-Instruct-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "evroc/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "evroc/openai/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/openai/whisper-large-v3-turbo": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/Qwen/Qwen3-Embedding-8B": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/Qwen/Qwen3-Reranker-4B": {
    toolCall: false,
    structuredOutput: null
  },
  "evroc/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/Qwen/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "evroc/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/anthropic/claude-opus-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/bytedance/seedance-2": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/deepseek-ai/deepseek-r1-distill-llama-70b": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/google/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/google/imagen-4.0-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/imagen-4.0-ultra": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/veo3.1": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/veo3.1-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/google/veo3.1-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/leonardo-ai/lucid-origin": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/leonardo-ai/lucid-realism": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/moonshotai/kimi-k2": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-5": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/openai/gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/openai/gpt-realtime-1.5": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/qwen/qwen3-coder": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/sarvam/sarvam-105b": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/sarvam/sarvam-30b": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/wanx/wan-v2-6": {
    toolCall: false,
    structuredOutput: null
  },
  "fastrouter/x-ai/grok-4": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "fastrouter/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "fastrouter/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/glm-5p2": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/glm-5p3": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/glm-5p3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/kimi-k2p6": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/kimi-k2p7-code": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/nemotron-3-ultra-nvfp4": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/nemotron-lightning-3p5-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/qwen3p7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/models/qwen3p8-2p4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "fireworks-ai/accounts/fireworks/models/qwen3p8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/routers/glm-5p2-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "fireworks-ai/accounts/fireworks/routers/kimi-k3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "freemodel/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "freemodel/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "freemodel/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "freemodel/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "freemodel/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "friendli/zai-org/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/gemini-3-1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gpt-5-3-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/gpt-5-4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gpt-5-4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gpt-5-5": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/grok-4-3": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/kimi-k2-6": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "frogbot/minimax-m2-5": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/minimax-m2-7": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/qwen-3-6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "frogbot/zai-glm-5-1": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/moonshotai/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/Qwen/Qwen3.7-Max": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/zai-org/GLM-5-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "gmicloud/zai-org/GLM-5.1-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "gmicloud/zai-org/GLM-5.2-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "google/deep-research-max-preview-04-2026": {
    toolCall: true,
    structuredOutput: null
  },
  "google/deep-research-preview-04-2026": {
    toolCall: true,
    structuredOutput: null
  },
  "google/gemini-2.5-computer-use-preview-10-2025": {
    toolCall: true,
    structuredOutput: null
  },
  "google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-2.5-flash-preview-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-2.5-pro-preview-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.1-flash-lite-image": {
    toolCall: true,
    structuredOutput: false
  },
  "google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.1-flash-live-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "google/gemini-3.1-flash-tts-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.5-live-translate-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-embedding-001": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-embedding-2": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-flash-lite-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemini-omni-flash-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "google/lyria-3-clip-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "google/lyria-3-pro-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "google/veo-3.1-fast-generate-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/veo-3.1-generate-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "google/veo-3.1-lite-generate-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "greenpt/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/devstral-2-123b-instruct-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/gemma-3-27b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/gemma4": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-caveman": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-caveman-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-caveman-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-honey": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-honey-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-honey-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-ponytail": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-ponytail-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/glm-5.2-ponytail-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/green-l": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/green-l-raw": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/green-r": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/green-r-raw": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/green-s": {
    toolCall: false,
    structuredOutput: null
  },
  "greenpt/green-s-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "greenpt/holo2-30b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "greenpt/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/kimi-k2.6-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/mistral-medium-3.5-128b": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/mistral-small-3.2-24b-instruct-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/pixtral-12b-2409": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "greenpt/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "greenpt/voxtral-small-24b-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "groq/allam-2-7b": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/canopylabs/orpheus-arabic-saudi": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/canopylabs/orpheus-v1-english": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/groq/compound": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/groq/compound-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/llama-3.1-8b-instant": {
    toolCall: true,
    structuredOutput: null
  },
  "groq/llama-3.3-70b-versatile": {
    toolCall: true,
    structuredOutput: null
  },
  "groq/meta-llama/llama-prompt-guard-2-22m": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/meta-llama/llama-prompt-guard-2-86m": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "groq/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "groq/openai/gpt-oss-safeguard-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "groq/qwen/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "groq/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "groq/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "groq/whisper-large-v3-turbo": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/chatgpt-4o-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-3-haiku-20240307": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-3.5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-3.5-sonnet-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-3.7-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-4.5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-4.5-opus": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-4.5-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-opus-4": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-opus-4-1": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/deepseek-r1-distill-llama-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/deepseek-reasoner": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/deepseek-tng-r1t2-chimera": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/deepseek-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/ernie-4.5-21b-a3b-thinking": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gemma-3-12b-it": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/gemma2-9b-it": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4.1-mini-2025-04-14": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4o": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5-chat-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/gpt-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5.1-chat-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-3": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-3-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-4": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-4-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/hermes-2-pro-llama-3-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/kimi-k2-0711": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-3.1-8b-instant": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-3.1-8b-instruct-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-3.3-70b-versatile": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-4-maverick": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-4-scout": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/llama-guard-4": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/llama-prompt-guard-2-22m": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/llama-prompt-guard-2-86m": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/mistral-large-2411": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/mistral-nemo": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/mistral-small": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/o1": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/o1-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/o3": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/o3-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/o3-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/o4-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen2.5-coder-7b-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/qwen3-235b-a22b-thinking": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen3-coder": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "helicone/sonar": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/sonar-deep-research": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/sonar-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/sonar-reasoning": {
    toolCall: false,
    structuredOutput: null
  },
  "helicone/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "hetzner/Qwen/Qwen3.6-35B-A3B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "hetzner/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "hpc-ai/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/zai-org/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "hpc-ai/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V4-Flash-Vision-Exp": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/google/gemma-4-26B-A4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/meta-llama/Llama-3.1-8B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/MiniMaxAI/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/MiniMaxAI/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/moonshotai/Kimi-K2-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/moonshotai/Kimi-K2-Instruct-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/moonshotai/Kimi-K2-Thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen2.5-Coder-32B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-235B-A22B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-30B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-Coder-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-Coder-480B-A35B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-Coder-Next": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-Embedding-4B": {
    toolCall: false,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-Embedding-8B": {
    toolCall: false,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-Next-80B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-Next-80B-A3B-Thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3-VL-235B-A22B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.5-122B-A10B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.5-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.8-2.4T-A95B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/Qwen/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/stepfun-ai/Step-3.5-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/stepfun-ai/Step-3.7-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/tencent/Hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/thinkingmachines/Inkling-Small": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/XiaomiMiMo/MiMo-V2-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/XiaomiMiMo/MiMo-V2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/XiaomiMiMo/MiMo-V2.5-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/zai-org/GLM-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.5-Air": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.5V": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.6V-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-4.7-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "huggingface/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/zai-org/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "huggingface/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "iflowcn/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/deepseek-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/kimi-k2": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-235b": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "iflowcn/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/cerebras/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/fireworks/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/fireworks/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/fireworks/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/groq/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/groq/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "impossibl/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "impossibl/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "impossibl/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/qwen/qwen3.8-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/xai/grok-4.20-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/xai/grok-4.20-0309-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/xai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/xai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "impossibl/zai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/zai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "impossibl/zai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "inception/mercury-2": {
    toolCall: true,
    structuredOutput: true
  },
  "inception/mercury-edit-2": {
    toolCall: false,
    structuredOutput: null
  },
  "inceptron/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "inceptron/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "inceptron/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "inceptron/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "inference/google/gemma-3": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/meta/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/meta/llama-3.2-11b-vision-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/meta/llama-3.2-1b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/meta/llama-3.2-3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/mistral/mistral-nemo-12b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/osmosis/osmosis-structure-0.6b": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/qwen/qwen-2.5-7b-vision-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "inference/qwen/qwen3-embedding-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "inferx/Agents-A1": {
    toolCall: true,
    structuredOutput: null
  },
  "inferx/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/Devstral-2-123B-Instruct-2512-int4-AutoRound": {
    toolCall: true,
    structuredOutput: null
  },
  "inferx/gemma-4-31B-it-fp8": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/mimo-v25": {
    toolCall: true,
    structuredOutput: null
  },
  "inferx/Ornith-1.0-35B-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "inferx/Qwen3-Coder-Next-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/Qwen3-Coder-Next-FP8-no-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/Qwen3-Embedding-8B": {
    toolCall: false,
    structuredOutput: null
  },
  "inferx/Qwen3.6-27B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/Qwen3.6-35B-A3B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "inferx/Qwen3.6-35B-A3B-fp8-no-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/bge_multilingual_gemma2": {
    toolCall: false,
    structuredOutput: null
  },
  "infomaniak/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/mini_lm_l12_v2": {
    toolCall: false,
    structuredOutput: null
  },
  "infomaniak/mistralai/Ministral-3-14B-Instruct-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/mistralai/Mistral-Small-4-119B-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "infomaniak/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "infomaniak/Qwen/Qwen3.5-122B-A10B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/Qwen/Qwen3.5-397B-A17B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "infomaniak/swiss-ai/Apertus-v1.5-70B": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/Intel/Qwen3-Coder-480B-A35B-Instruct-int4-mixed-ar": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/meta-llama/Llama-3.2-90B-Vision-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/mistralai/Devstral-Small-2505": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/mistralai/Magistral-Small-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/mistralai/Mistral-Large-Instruct-2411": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/mistralai/Mistral-Nemo-Instruct-2407": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/moonshotai/Kimi-K2-Instruct-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/moonshotai/Kimi-K2-Thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/Qwen/Qwen2.5-VL-32B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/Qwen/Qwen3-Next-80B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "io-net/zai-org/GLM-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "iteracompute/iteracompute/ornith-1.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "iteracompute/iteracompute/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3-Next-80B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3-Next-80B-A3B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3-VL-235B-A22B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3.5-122B-A10B": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3.5-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "jalapeno/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/baidu/ernie-4.5-300b-a47b-paddle": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/baidu/ernie-4.5-vl-424b-a47b": {
    toolCall: true,
    structuredOutput: false
  },
  "jiekou/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-opus-4-20250514": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-sonnet-4-20250514": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/deepseek/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/deepseek/deepseek-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-flash-lite-preview-06-17": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-flash-lite-preview-09-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-flash-preview-05-20": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-2.5-pro-preview-06-05": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-4-0709": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-4-fast-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/minimaxai/minimax-m1-80k": {
    toolCall: true,
    structuredOutput: false
  },
  "jiekou/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/moonshotai/kimi-k2-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-235b-a22b-fp8": {
    toolCall: false,
    structuredOutput: false
  },
  "jiekou/qwen/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-30b-a3b-fp8": {
    toolCall: false,
    structuredOutput: false
  },
  "jiekou/qwen/qwen3-32b-fp8": {
    toolCall: false,
    structuredOutput: false
  },
  "jiekou/qwen/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/xiaomimimo/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/zai-org/glm-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/zai-org/glm-4.5v": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/zai-org/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "jiekou/zai-org/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/deepseek-v4-flash:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-2-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-2-5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-3-1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-3-1-flash-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "kenari/gemini-3-1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-3-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-3-6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemini-3-7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/glm-4-7-flash:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/glm-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/glm-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/glm-5-3": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/glm-5-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-5-4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-5-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-5-6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-5-6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-5-6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "kenari/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/grok-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/grok-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/grok-build-0-1": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/grok-imagine-image-2-0": {
    toolCall: false,
    structuredOutput: null
  },
  "kenari/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/hy3:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/kimi-k2-6": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/kimi-k2-6:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/kimi-k2-7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/kimi-k2-7-code:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/mimo-v2-5": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/mimo-v2-5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/mimo-v2-5:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/minimax-m2-7": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/minimax-m2-7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/mistral-large:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/mistral-medium-3-5:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kenari/nemotron-3-nano-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/nemotron-3-super-120b-a12b:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/qwen3-7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/qwen3-8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/step-3-7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/step-3-7-flash:free": {
    toolCall: true,
    structuredOutput: null
  },
  "kenari/whisper-large-v3-turbo": {
    toolCall: false,
    structuredOutput: null
  },
  "kilo/~anthropic/claude-fable-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~anthropic/claude-haiku-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~anthropic/claude-opus-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~anthropic/claude-sonnet-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~deepseek/deepseek-v4-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~google/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~moonshotai/kimi-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~openai/gpt-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~openai/gpt-mini-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~x-ai/grok-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~z-ai/glm-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/~z-ai/glm-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/aion-labs/aion-2.0": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/aion-labs/aion-3.0": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/aion-labs/aion-3.0-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/aion-labs/aion-rp-llama-3.1-8b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/amazon/nova-2-lite-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/amazon/nova-lite-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/amazon/nova-micro-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/amazon/nova-premier-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/amazon/nova-pro-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/anthracite-org/magnum-v4-72b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/anthropic/claude-3-haiku": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-opus-4": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/anthropic/claude-opus-4.1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/arcee-ai/trinity-large-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/baidu/ernie-4.5-vl-424b-a47b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/bytedance-seed/seed-1.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance-seed/seed-1.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance-seed/seed-2-1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance-seed/seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance-seed/seed-2.0-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance-seed/seed-2.0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/bytedance/ui-tars-1.5-7b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/cognitivecomputations/dolphin-mistral-24b-venice-edition": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/cohere/command-a": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/cohere/command-r-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/cohere/command-r-plus-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/cohere/command-r7b-12-2024": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/cohere/north-mini-code:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-chat-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-chat-v3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-r1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-r1-distill-llama-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/deepseek/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v3.2-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/dots-studio/dots-3-note-preview:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-2.5-pro-preview-05-06": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3-pro-image": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-flash-lite-image": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemma-2-27b-it": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemma-3-12b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemma-3-27b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemma-3-4b-it": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/google/lyria-3-clip-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/google/lyria-3-pro-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/gryphe/mythomax-l2-13b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/ibm-granite/granite-4.0-h-micro": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/ibm-granite/granite-4.2-8b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/inception/mercury-2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/inception/mercury-2.5-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/inclusionai/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/inclusionai/ling-3.0-flash-fin": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/inclusionai/ling-3.0-flash-fin:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/inclusionai/ling-3.0-flash-sante:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kilo-auto/balanced": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kilo-auto/efficient": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kilo-auto/free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kilo-auto/frontier": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kilo-auto/small": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/kwaipilot/kat-coder-pro-v2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/kwaipilot/kat-coder-pro-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/liquid/lfm-2.5-2.6b:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mancer/weaver": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/meituan/longcat-2.0": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/meta-llama/llama-3.1-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-3.2-1b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/meta-llama/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-4-maverick": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-4-scout": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta-llama/llama-guard-4-12b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/meta/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/meta/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/microsoft/phi-4": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/microsoft/wizardlm-2-8x22b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/minimax/minimax-01": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/minimax/minimax-m1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/minimax/minimax-m2-her": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/minimax/minimax-m2.7:free": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/minimax/minimax-m3:free": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/mistralai/codestral-2508": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/devstral-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/ministral-14b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/ministral-3b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/ministral-8b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-large": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-large-2407": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-large-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-medium-3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-medium-3-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-medium-3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-nemo": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-saba": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-small-24b-instruct-2501": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-small-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mistral-small-3.1-24b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/mistralai/mistral-small-3.2-24b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/mixtral-8x22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/mistralai/voxtral-small-24b-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k2": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/morph/morph-v3-fast": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/morph/morph-v3-large": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/nex-agi/nex-n2-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/nex-agi/nex-n2-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/nousresearch/hermes-3-llama-3.1-405b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/nousresearch/hermes-3-llama-3.1-70b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/nousresearch/hermes-4-405b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/nousresearch/hermes-4-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "kilo/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/nvidia/nemotron-3-super-120b-a12b:free": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/nvidia/nemotron-3-ultra-550b-a55b:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/nvidia/nemotron-3.5-content-safety": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/nvidia/nemotron-3.5-content-safety:free": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/nvidia/nemotron-3.5-lightning": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/nvidia/nemotron-3.5-lightning:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/openai/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-3.5-turbo-0613": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-3.5-turbo-16k": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-3.5-turbo-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/openai/gpt-4": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4-turbo-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o-2024-05-13": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-4o-mini-2024-07-18": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5-image": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/openai/gpt-5-image-mini": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.2-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.4-image-2": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-luna-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-sol-discounted": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/openai/gpt-5.6-sol-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-5.6-terra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-6-astra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-audio": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-audio-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/gpt-oss-safeguard-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o1-pro": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o3-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openai/o4-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openrouter/auto": {
    toolCall: true,
    structuredOutput: null
  },
  "kilo/openrouter/bodybuilder": {
    toolCall: false,
    structuredOutput: null
  },
  "kilo/openrouter/free": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/openrouter/pareto-code": {
    toolCall: false,
    structuredOutput: null
  },
  "kilo/perceptron/perceptron-mk1": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/perplexity/sonar": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/perplexity/sonar-deep-research": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/perplexity/sonar-pro-search": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/poolside/laguna-s-2.1:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/poolside/laguna-xs-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/poolside/laguna-xs-2.1:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen-2.5-72b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen-2.5-7b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen-2.5-coder-32b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/qwen/qwen-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen-plus-2025-07-28": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-14b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3-235b-a22b-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-30b-a3b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-30b-a3b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3-32b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-8b": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-max-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-30b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-32b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3-vl-8b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-flash-02-23": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-plus-02-15": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.5-plus-20260420": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/qwen/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/rekaai/reka-edge": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/rekaai/reka-flash-3": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/relace/relace-apply-3": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/relace/relace-search": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/sakana/sakana-namazu": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/sao10k/l3-lunaris-8b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/sao10k/l3.1-euryale-70b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/sao10k/l3.3-euryale-70b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/stealth/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stealth/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stealth/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stealth/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stealth/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stepfun/step-3.5-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/stepfun/step-3.7-flash:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/tencent/hunyuan-a13b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/tencent/hy-mt2-1.8b": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/tencent/hy-mt2-30b-a3b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/tencent/hy-mt2-7b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/tencent/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/tencent/hy3-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/tencent/hy4-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/thedrummer/cydonia-24b-v4.1": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/thedrummer/skyfall-36b-v2": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/thedrummer/unslopnemo-12b": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/thinkingmachines/inkling-small:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/thinkingmachines/inkling:free": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/undi95/remm-slerp-l2-13b": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/upstage/solar-pro-3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/upstage/solar-pro4": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/writer/palmyra-x5": {
    toolCall: false,
    structuredOutput: false
  },
  "kilo/x-ai/grok-4.20": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/x-ai/grok-4.20-multi-agent": {
    toolCall: false,
    structuredOutput: true
  },
  "kilo/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/x-ai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/z-ai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/z-ai/glm-4.5v": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-4.6v": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "kilo/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "kilo/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "kimi-for-coding/k3": {
    toolCall: true,
    structuredOutput: true
  },
  "kimi-for-coding/k3-256k": {
    toolCall: true,
    structuredOutput: true
  },
  "kimi-for-coding/kimi-for-coding": {
    toolCall: true,
    structuredOutput: true
  },
  "kimi-for-coding/kimi-for-coding-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "klokintegration/Kloker": {
    toolCall: true,
    structuredOutput: false
  },
  "klokintegration/Kloker-Integration-Architect": {
    toolCall: true,
    structuredOutput: false
  },
  "klokintegration/Kloker-Integration-Developer": {
    toolCall: true,
    structuredOutput: false
  },
  "kosmik/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "kuae-cloud-coding-plan/GLM-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "lilac/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "lilac/minimaxai/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "lilac/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "lilac/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llama/cerebras-llama-4-maverick-17b-128e-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/cerebras-llama-4-scout-17b-16e-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/groq-llama-4-maverick-17b-128e-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/llama-3.3-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/llama-4-maverick-17b-128e-instruct-fp8": {
    toolCall: true,
    structuredOutput: null
  },
  "llama/llama-4-scout-17b-16e-instruct-fp8": {
    toolCall: true,
    structuredOutput: null
  },
  "llmgateway-providers/alibaba/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-coder-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-omni-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen-plus-latest": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3-vl-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3-vl-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.7-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/alibaba/qwen3.8-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/alibaba/qwen35-397b-a17b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-fable-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/claude-opus-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/grok-4-3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/grok-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-bedrock/llama-3.1-70b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/llama-4-maverick-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/aws-bedrock/llama-4-scout-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/aws-mantle/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-mantle/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/aws-mantle/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-ai-foundry/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure-ai-foundry/grok-4-1-fast-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure-ai-foundry/grok-4-3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure-anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure-anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-4": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-4o": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/azure/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/azure/o1": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/azure/o3": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/azure/o3-mini": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/azure/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/baidu/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/baidu/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/seed-1-6-250615": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/seed-1-6-250915": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/seed-1-6-flash-250715": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/bytedance/seed-1-8-251228": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/canopywave/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/canopywave/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/canopywave/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/canopywave/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/canopywave/kimi-k3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/cerebras/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/cerebras/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/cerebras/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/cerebras/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/cerebras/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/consensusprotocol/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/consensusprotocol/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/consensusprotocol/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/consensusprotocol/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/deepinfra/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/deepinfra/mimo-v2.5-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/nemotron-3-ultra-550b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepinfra/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/deepseek/deepseek-v4-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "llmgateway-providers/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: null,
    structuredOutput: null
  },
  "llmgateway-providers/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/embercloud/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/fireworks/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/fireworks/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/fireworks/kimi-k3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/fireworks/kimi-k3-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/gonka24/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/gonka24/kimi-k2.6": {
    toolCall: null,
    structuredOutput: null
  },
  "llmgateway-providers/gonka24/minimax-m2.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/google-ai-studio/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-ai-studio/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/google-vertex/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/groq/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/groq/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/inference.net/llama-3.2-11b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/meta-contributor/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/meta-contributor/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.1-lightning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/minimax/minimax-text-01": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/codestral-2508": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/devstral-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/ministral-14b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/ministral-3b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/ministral-8b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/mistral-large-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/mistral-large-latest": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/mistral/mistral-small-2506": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/moonshot/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/moonshot/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/moonshot/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/moonshot/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/moonshot/kimi-k3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/ernie-4.5-vl-424b-a47b": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-4.5v": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-4.6v": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/novita/kimi-k2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/novita/kimi-k3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/llama-3-70b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/llama-4-maverick-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/llama-4-scout-17b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/mimo-v2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/minimax-m2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/minimax-m2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/minimax-m2.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-235b-a22b-fp8": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-vl-235b-a22b-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3.7-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/novita/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/novita/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/novita/qwen35-397b-a17b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-4": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-4o-mini-transcribe": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-4o-transcribe": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/openai/o1": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/openai/o3": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/openai/o3-mini": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/perplexity/sonar": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/quartz/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/ranoai/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/runware/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/runware/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/runware/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/runware/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/runware/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/runware/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/runware/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/runware/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/runware/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai-gp/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/scx-ai-gp/qwen3.8-max": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai/llama-4-maverick-17b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai/minimax-m2.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/scx-ai/qwen3-32b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/together-ai/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/together-ai/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/glm-4.7": {
    toolCall: false,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/kimi-k3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/together-ai/minimax-m3": {
    toolCall: false,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-openai/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/grok-4-20-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/grok-4-20-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/grok-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "llmgateway-providers/vertex-openai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/vertex-openai/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4-20-beta-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4-20-beta-0309-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4-3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-4-6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xai/grok-build-0-1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4-32b-0414-128k": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.5-airx": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.5-x": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.5v": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.6v": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.6v-flashx": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "llmgateway-providers/zai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "llmtech/unsloth/Qwen3.8-27B-NVFP4": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/gemma-4": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/magibu-11b-v8": {
    toolCall: false,
    structuredOutput: null
  },
  "llmtr/medgemma-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "llmtr/meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/mimo/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/mimo/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/mistral/voxtral-small-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/muse-glimmer-30b-tr": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/perplexity/sonar-deep-research": {
    toolCall: false,
    structuredOutput: null
  },
  "llmtr/poolside/laguna-xs-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "llmtr/publicai/apertus-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/publicai/apertus-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/qwen/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/qwen3-6-35b": {
    toolCall: false,
    structuredOutput: true
  },
  "llmtr/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "llmtr/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/trendyol-asure-12b": {
    toolCall: false,
    structuredOutput: null
  },
  "llmtr/upstage/solar-pro2": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/upstage/solar-pro3": {
    toolCall: true,
    structuredOutput: null
  },
  "llmtr/upstage/solar-pro4": {
    toolCall: true,
    structuredOutput: true
  },
  "lmstudio/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "lmstudio/qwen/qwen3-30b-a3b-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "lmstudio/qwen/qwen3-coder-30b": {
    toolCall: true,
    structuredOutput: null
  },
  "longcat/LongCat-2.0": {
    toolCall: true,
    structuredOutput: null
  },
  "lucidquery/lucidnova-rf1-100b": {
    toolCall: true,
    structuredOutput: null
  },
  "lucidquery/lucidquery-agi-01-frontier": {
    toolCall: true,
    structuredOutput: null
  },
  "lucidquery/lucidquery-agi-01-swift": {
    toolCall: true,
    structuredOutput: null
  },
  "lucidquery/lucidquery-nexus-coder": {
    toolCall: true,
    structuredOutput: null
  },
  "lynkr/lynkr-auto": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: false,
    structuredOutput: null
  },
  "meganova/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/deepseek-ai/DeepSeek-V3.2-Exp": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/MiniMaxAI/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/mistralai/Mistral-Nemo-Instruct-2407": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/mistralai/Mistral-Small-3.2-24B-Instruct-2506": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/moonshotai/Kimi-K2-Thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/Qwen/Qwen2.5-VL-32B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "meganova/Qwen/Qwen3.5-Plus": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/XiaomiMiMo/MiMo-V2-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/zai-org/GLM-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/zai-org/GLM-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "meganova/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/anthropic/claude-3-7-sonnet-20250219": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-20250514": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-sonnet-4-20250514": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/anthropic/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/bytedance/dola-seed-2.0-code": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/bytedance/dola-seed-2.0-code-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/bytedance/dola-seed-2.0-lite": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/bytedance/dola-seed-2.0-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/bytedance/dola-seed-2.0-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/cohere/command-a-03-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/cohere/command-r-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/cohere/command-r-plus-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/cohere/command-r7b-12-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-r1": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/deepseek/deepseek-v3": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-v3.2": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-v4-flash-0731-fast": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-v4-pro-0423": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-2.5-computer-use-preview-10-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/google/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-embedding-001": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemini-flash-lite-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/google/gemma-4-26b-a4b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/google/gemma-4-31b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/meta/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/meta/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/mistral/codestral-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/devstral-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/mistral/devstral-medium-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/devstral-medium-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/devstral-small-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/magistral-medium-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/mistral-large-2411": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/mistral-large-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/mistral/mistral-large-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/mistral-medium-2505": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/mistral/mistral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/mistral/mistral-small-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/mistral/pixtral-large-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/moonshot/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/moonshot/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/moonshot/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/moonshot/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/moonshot/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "merge-gateway/nvidia/nemotron-3.5-lightning-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/nvidia/nemotron-nano-9b-v2": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/gpt-4": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4o-2024-05-13": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5-chat-latest": {
    toolCall: false,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.1-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.2-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.3-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/gpt-oss-120b": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/gpt-oss-20b": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/gpt-oss-safeguard-120b": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-32b": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3-coder-480b-a35b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-coder-next": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3-vl-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/qwen/qwen3.8-2.4t-a95b": {
    toolCall: false,
    structuredOutput: false
  },
  "merge-gateway/qwen/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/sakana/sakana-namazu": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/writer/palmyra-x4": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/writer/palmyra-x5": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/xai/grok-4.20-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/xai/grok-4.20-0309-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/xai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/xai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/xai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/zai/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-4.5v": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/zai/glm-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "merge-gateway/zai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "merge-gateway/zai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "meta/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "minimax/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-coding-plan/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "minimax-cn-coding-plan/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/codestral-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-medium-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-medium-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-small-2505": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/devstral-small-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/labs-devstral-small-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/magistral-medium-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/magistral-small": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/ministral-3b-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/ministral-8b-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-embed": {
    toolCall: false,
    structuredOutput: null
  },
  "mistral/mistral-large-2411": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-large-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-large-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-medium-2505": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-medium-2508": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-medium-2604": {
    toolCall: true,
    structuredOutput: true
  },
  "mistral/mistral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "mistral/mistral-nemo": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-small-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-small-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/mistral-small-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/open-mistral-7b": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/open-mistral-nemo": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/open-mixtral-8x22b": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/open-mixtral-8x7b": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/pixtral-12b": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/pixtral-large-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/voxtral-mini-latest": {
    toolCall: false,
    structuredOutput: null
  },
  "mistral/voxtral-mini-tts-latest": {
    toolCall: false,
    structuredOutput: null
  },
  "mistral/voxtral-small-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "mistral/zai-glm-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "mixlayer/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: null
  },
  "mixlayer/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: null
  },
  "mixlayer/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "mixlayer/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: null
  },
  "mixlayer/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: null
  },
  "moark/GLM-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "moark/MiniMax-M2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "modal/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "modal/Qwen/Qwen3.8-2.4T-A95B": {
    toolCall: true,
    structuredOutput: true
  },
  "modal/thinkingmachines/Inkling-NVFP4": {
    toolCall: true,
    structuredOutput: false
  },
  "modal/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "model-oracle-ai/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "model-oracle-ai/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "model-oracle-ai/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "model-oracle-ai/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "model-oracle-ai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "modelis/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "modelis/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "modelis/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "modelis/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "modelis/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "modelis/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "modelis/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "modelis/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "modelis/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/Qwen/Qwen3-30B-A3B-Thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/Qwen/Qwen3-Coder-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/ZhipuAI/GLM-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "modelscope/ZhipuAI/GLM-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai-cn/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai-cn/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai-cn/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "moonshotai-cn/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "morph/auto": {
    toolCall: false,
    structuredOutput: null
  },
  "morph/morph-v3-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "morph/morph-v3-large": {
    toolCall: false,
    structuredOutput: null
  },
  "nan/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nan/gemma4": {
    toolCall: true,
    structuredOutput: true
  },
  "nan/glm5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nan/glm5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nan/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "nan/qwen3.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nan/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/abacusai/Dracarys-72B-Instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/abliteration-ai/abliterated-model": {
    toolCall: false,
    structuredOutput: true
  },
  "nano-gpt/abliteration-ai/abliterated-model-large": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/abliteration-ai/abliterated-model-large-v2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/aion-labs/aion-2.0": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/aion-labs/aion-3.0": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/aion-labs/aion-3.0-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/aion-labs/aion-rp-llama-3.1-8b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/alibaba/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/alibaba/qwen3.6-27b:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/alibaba/qwen3.6-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/alibaba/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/alibaba/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/amazon/nova-2-lite-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/amazon/nova-lite-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/amazon/nova-pro-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/anthracite-org/magnum-v2-72b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/anthracite-org/magnum-v4-72b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-fable-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-haiku-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.6:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.6:thinking:low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.6:thinking:max": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.6:thinking:medium": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.7:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-4.8:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-opus-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-sonnet-4.6:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-sonnet-5:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/anthropic/claude-sonnet-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/arcee-ai/trinity-large-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/asi1-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/auto-model": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/auto-model-basic": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/auto-model-premium": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/auto-model-standard": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/azure-gpt-4-turbo": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/azure-gpt-4o": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/azure-gpt-4o-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/azure-o1": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/azure-o3-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/baseten/Kimi-K2-Instruct-FP4": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/brave": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/brave-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/brave-research": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/bytedance-seed/seed-2-1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/bytedance-seed/seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/bytedance-seed/seed-2.0-lite": {
    toolCall: false,
    structuredOutput: true
  },
  "nano-gpt/bytedance/doubao-seed-2.1-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/bytedance/doubao-seed-2.1-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/bytedance/doubao-seed-character": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/celeris-1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/chutesai/Mistral-Small-3.2-24B-Instruct-2506": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-haiku-4-5-20251001-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-1-20250805": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-1-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-1-thinking:1024": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-1-thinking:32768": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-1-thinking:8192": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-20250514": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-5-20251101:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-thinking:1024": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-thinking:32768": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-opus-4-thinking:8192": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-20250514": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-5-20250929-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-thinking:1024": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-thinking:32768": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-thinking:64000": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claude-sonnet-4-thinking:8192": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claw-high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claw-low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/claw-medium": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/cohere/command-r-plus-08-2024": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/command-a-reasoning-08-2025": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/crofai/greg-2-super": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/crofai/greg-2-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepclaude": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepcogito/cogito-v1-preview-qwen-32B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/deepseek-ai/DeepSeek-V3.1-Terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek-ai/DeepSeek-V3.1-Terminus:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek-ai/DeepSeek-V3.1:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/deepseek-ai/deepseek-v3.2-exp": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-ai/deepseek-v3.2-exp-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek-chat-cheaper": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek-r1": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/deepseek-r1-sambanova": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-reasoner": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-reasoner-cheaper": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/deepseek-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v3.2:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash-0731:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-flash-vision-exp-uncensored": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/deepseek/deepseek-v4-flash:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-pro-0813:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/deepseek/deepseek-v4-pro:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/Doctor-Shotgun/MS3.2-24B-Magnum-Diamond": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-1.5-pro-256k": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-1.5-pro-32k": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-1.5-vision-pro-32k": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-1-6-250615": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-1-6-flash-250615": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-2-0-code-preview-260215": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-2-0-lite-260215": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-2-0-mini-260215": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/doubao-seed-2-0-pro-260215": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Envoid/Llama-3.05-Nemotron-Tenyxchat-Storybreaker-70B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Envoid/Llama-3.05-NT-Storybreaker-Ministral-70B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/ernie-5.0-thinking-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/ernie-5.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/ernie-5.1:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/ernie-x1.1-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/EVA-UNIT-01/EVA-LLaMA-3.33-70B-v0.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/EVA-UNIT-01/EVA-Qwen2.5-32B-v0.2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/EVA-UNIT-01/EVA-Qwen2.5-72B-v0.2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/exa-answer": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/failspy/Meta-Llama-3-70B-Instruct-abliterated-v3.5": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/fastgpt": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/featherless-ai/Qwerky-72B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/GalrionSoftworks/MN-LooseCannon-12B-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.0-pro-exp-02-05": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.0-pro-reasoner": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-lite-preview-06-17": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-lite-preview-09-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemini-2.5-flash-lite-preview-09-2025-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemini-2.5-flash-nothinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-preview-04-17": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-preview-04-17:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-preview-05-20": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-preview-05-20:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-flash-preview-09-2025": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemini-2.5-flash-preview-09-2025-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-pro-exp-03-25": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-pro-preview-03-25": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-pro-preview-05-06": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-2.5-pro-preview-06-05": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemini-exp-1206": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-12b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemma-4-26b-a4b-it-chimerax": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-darksoul": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-luminous": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-moonlight": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-musica": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-opusdistill": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-it-shadowsiren": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-26B-A4B-MeroMero": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-26B-A4B-MeroMero:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-26b-a4b-uncensored": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemma-4-26b-a4b-uncensored:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/Gemma-4-31B-Claude-4.6-Opus-Reasoning-Distilled": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-Cognitive-Unshackled": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-DarkIdol": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-GarnetV2": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-darkidol": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-fabled": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-garnet": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-gembrain": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-gemsicle": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-isometry": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-31b-it-novelist": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-MeroMero-v2": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-MeroMero-v2:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Gemma-4-31B-Queen": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/gemma-4-e2b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/gemma-4-e4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/glm-4-air-0111": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/glm-4-long": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/glm-4-plus-0111": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/glm-4.1v-thinking-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/glm-4.1v-thinking-flashx": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/GLM-4.6-Derestricted-v5": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/glm-z1-airx": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3-flash-preview-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.1-pro-preview-high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.1-pro-preview-low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.5-flash-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-flash-lite-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemma-4-26b-a4b-it:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/google/gemma-4-31b-it:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/Gryphe/MythoMax-L2-13b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/hermes-high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/hermes-low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/hermes-medium": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/holo3-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/holo3-35b-a3b:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/huihui-ai/DeepSeek-R1-Distill-Llama-70B-abliterated": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/huihui-ai/DeepSeek-R1-Distill-Qwen-32B-abliterated": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/huihui-ai/Llama-3.3-70B-Instruct-abliterated": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/huihui-ai/Qwen2.5-32B-Instruct-abliterated": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/ibm-granite/granite-4.2-8b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/inception/mercury-2.5-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/inclusionai/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/inclusionai/ling-3.0-flash:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/inflatebot/MN-12B-Mag-Mell-R1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/kimi-k2-instruct-fast": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/LatitudeGames/Wayfarer-Large-70B-Llama-3.3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/liquid/lfm-2.5-2.6b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/LLM360/K2-Think": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/longcat-2.0": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/longcat-2.0:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/MarinaraSpaghetti/NemoMix-Unleashed-12B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meganova-ai/manta-flash-1.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meganova-ai/manta-mini-1.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meganova-ai/manta-pro-1.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mercury-2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mercury-coder-small": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Meta-Llama-3-1-8B-Instruct-FP8": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meta-llama/llama-3.1-8b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meta-llama/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meta-llama/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta-llama/llama-4-maverick": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta-llama/llama-4-scout": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta/muse-spark-1.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/meta/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/microsoft/wizardlm-2-8x22b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/MiniMax-M1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/MiniMax-M2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/minimax/minimax-01": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/minimax/minimax-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m2-her": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m2.7-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/minimax/minimax-m3:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/MiniMaxAI/MiniMax-M1-80k": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistral-code-agent-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistral-code-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistral-small-31-24b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistral/mistral-medium-3.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistral/mistral-medium-3.5:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistralai/codestral-2508": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/devstral-2-123b-instruct-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/Devstral-Small-2505": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/ministral-14b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/ministral-14b-instruct-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/ministral-3b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/ministral-8b-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-large": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-large-3-675b-instruct-2512": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-medium-3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-medium-3.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/Mistral-Nemo-Instruct-2407": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-saba": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mistralai/mistral-small-4-119b-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistralai/mistral-small-4-119b-2603:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/mistralai/mixtral-8x22b-instruct-v0.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/mlabonne/NeuralDaredevil-8B-abliterated": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/moonshotai/kimi-k2-instruct-0711": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/moonshotai/Kimi-K2-Instruct-0905": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2.5:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2.6:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/moonshotai/kimi-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/nano-gpt-help": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nanogpt/coding-router": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/nanogpt/coding-router:high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/nanogpt/coding-router:low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/nanogpt/coding-router:max": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/nanogpt/coding-router:medium": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/NeverSleep/Lumimaid-v0.2-70B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nex-agi/nex-n2-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/nex-agi/nex-n2-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/nothingiisreal/L3.1-70B-Celeste-V0.1-BF16": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/NousResearch/hermes-3-llama-3.1-70b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/NousResearch/hermes-4-405b": {
    toolCall: false,
    structuredOutput: true
  },
  "nano-gpt/NousResearch/hermes-4-405b:thinking": {
    toolCall: false,
    structuredOutput: true
  },
  "nano-gpt/nvidia/Llama-3.1-Nemotron-70B-Instruct-HF": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nvidia/Llama-3.3-Nemotron-Super-49B-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3-super-120b-a12b:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3-ultra-550b-a55b:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3.5-lightning": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/nvidia/nemotron-3.5-lightning:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-4.1-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4.1-nano": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-4o-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5-nano": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.1-2025-11-13": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.1-codex": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.1-codex-mini": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-luna-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-sol-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-5.6-terra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-6-astra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/openai/gpt-oss-safeguard-20b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/o1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/o1-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/o3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/o3-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/o3-mini-low": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/o3-pro-2025-06-10": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/openai/o4-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/ornith-ai/ornith-1.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/ornith-ai/ornith-1.5-35b-a3b:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/ornith-ai/ornith-1.5-9b": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/ornith-ai/ornith-1.5-9b:thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/pamanseau/OpenReasoning-Nemotron-32B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/perceptron/perceptron-mk1": {
    toolCall: false,
    structuredOutput: true
  },
  "nano-gpt/perplexity-academic-researcher": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/phi-4-mini-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/phi-4-multimodal-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/pokee-isaac": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/poolside/laguna-s-2.1:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qvq-max": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen-3.6-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen-long": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen-max": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen-2.5-72b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/Qwen2.5-Coder-32B-Instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-14b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-30b-a3b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-32b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/Qwen3-8B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3-coder-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3-coder-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3-max": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/Qwen3-Next-80B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.5-397b-a17b-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.5-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.5-plus-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.6-35b-a3b-uncensored": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/qwen/qwen3.6-35b-a3b-uncensored:thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/qwen/Qwen3.6-35B-A3B:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3.8-27b-fable": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen/qwen3.8-27b-obliterated": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3.8-27b-obliterated:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3.8-27b-uncensored": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen/qwen3.8-27b-uncensored:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen25-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3-30b-a3b-instruct-2507": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3-max-2026-01-23": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3-vl-235b-a22b-instruct-original": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3-vl-235b-a22b-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-0.8b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.5-122b-a10b:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Qwen3.5-27B-BlueStar-v3-Derestricted": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/Qwen3.5-27B-Queen-Derestricted": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-27b:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-2b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-35b-a3b:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-4b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.5-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-flash:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-omni-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.5-omni-plus": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.6-max-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.7-flash:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.7-max": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.7-max:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.7-plus:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.8-27b:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/qwen3.8-max:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/ReadyArt/MS3.2-The-Omega-Directive-24B-Unslop-v2.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/sakana/fugu-ultra-v1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/Salesforce/Llama-xLAM-2-70b-fc-r": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Sao10K/L3-8B-Stheno-v3.2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Sao10K/L3.1-70B-Euryale-v2.2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Sao10K/L3.1-70B-Hanami-x1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Sao10K/L3.3-70B-Euryale-v2.3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sarvam-105b": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/shisa-ai/shisa-v2-llama3.3-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/shisa-ai/shisa-v2.1-llama3.3-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sonar": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sonar-deep-research": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sonar-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/soob3123/amoral-gemma3-27B-v2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/soob3123/GrayLine-Qwen3-8B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/soob3123/Veiled-Calla-12B": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Steelskull/L3.3-Cu-Mai-R1-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Steelskull/L3.3-Electra-R1-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Steelskull/L3.3-MS-Nevoria-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/Steelskull/L3.3-Nevoria-R1-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/stepfun-ai/step-3.5-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/stepfun-ai/step-3.5-flash-2603": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/stepfun/step-3.7-flash:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/deepseek-v3.2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/gemma-4-26b-a4b-uncensored": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/TEE/gemma4-31b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/gemma4-31b:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/TEE/glm-5.1-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/glm-5.2:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/gpt-oss-120b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/gpt-oss-20b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/kimi-k2.6": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/TEE/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/TEE/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/llama3-3-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/qwen3.5-27b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/qwen3.5-397b-a17b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/qwen3.6-27b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/qwen3.6-35b-a3b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TEE/qwen3.6-35b-a3b-uncensored": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TEE/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/tencent/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/tencent/hy4-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/TheDrummer/Anubis-70B-v1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Anubis-70B-v1.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Artemis-v1.1": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Cydonia-24B-v2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Cydonia-24B-v4": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Cydonia-24B-v4.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Cydonia-24B-v4.3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Magidonia-24B-v4.3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/Rocinante-12B-v1.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/skyfall-36b-v2": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/TheDrummer/UnslopNemo-12B-v4.1": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/thinkingmachines/Inkling-Small": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/thinkingmachines/Inkling-Small:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/thinkingmachines/inkling:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/THUDM/GLM-4-32B-0414": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/THUDM/GLM-4-9B-0414": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/THUDM/GLM-Z1-9B-0414": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/undi95/remm-slerp-l2-13b": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/universal-summarizer": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/unsloth/gemma-3-12b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/unsloth/gemma-3-27b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/unsloth/gemma-3-4b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/upstage/solar-pro-3": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/upstage/solar-pro4": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/upstage/solar-pro4:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/venice-uncensored": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/VongolaChouko/Starcannon-Unleashed-12B-v1.0": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/x-ai/grok-4.20": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-4.20-multi-agent": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/x-ai/grok-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5-pro-crof": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5-pro-crof:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5-pro:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/xiaomi/mimo-v2.5:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/yi-large": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/yi-medium-200k": {
    toolCall: null,
    structuredOutput: null
  },
  "nano-gpt/z-ai/glm-4.5": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/GLM-4.5-Air": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/GLM-4.5-Air:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/GLM-4.5:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.5v": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.5v:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.6-original": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/z-ai/GLM-4.6-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/GLM-4.6-turbo:thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.6:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.6v": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.6v-original": {
    toolCall: false,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.7-flash-original": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.7-flash-original:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.7-flash:thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "nano-gpt/z-ai/glm-4.7-original": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.7-original:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-4.7:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5-original": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5-original:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.1:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.2:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.3-flash-uncensored": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5.3:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-5v-turbo:thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "nano-gpt/z-ai/glm-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "nearai/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "nearai/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "nearai/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "nearai/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "nearai/black-forest-labs/FLUX.2-klein-4B": {
    toolCall: false,
    structuredOutput: null
  },
  "nearai/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/google/gemini-3-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "nearai/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/google/gemma-4-31B-it": {
    toolCall: null,
    structuredOutput: null
  },
  "nearai/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/gpt-oss-120b": {
    toolCall: null,
    structuredOutput: null
  },
  "nearai/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/openai/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "nearai/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: null,
    structuredOutput: null
  },
  "nearai/Qwen/Qwen3-Embedding-0.6B": {
    toolCall: false,
    structuredOutput: null
  },
  "nearai/Qwen/Qwen3-Reranker-0.6B": {
    toolCall: false,
    structuredOutput: null
  },
  "nearai/Qwen/Qwen3-VL-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/Qwen/Qwen3.5-122B-A10B": {
    toolCall: null,
    structuredOutput: null
  },
  "nearai/Qwen/Qwen3.6-35B-A3B-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "nearai/zai-org/GLM-5.1-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/google/gemma-3-27b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "nebius/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/NousResearch/Hermes-4-405B": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/nvidia/Nemotron-3_5-Lightning": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/nvidia/Nemotron-3-Ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: null
  },
  "nebius/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "nebius/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/Qwen/Qwen3-Embedding-8B": {
    toolCall: false,
    structuredOutput: false
  },
  "nebius/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nebius/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: false
  },
  "neon/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-4-1": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemini-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gemma-3-12b": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/glm-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/glm-5-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-1": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-2": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-4": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-5": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/grok-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/inkling": {
    toolCall: true,
    structuredOutput: false
  },
  "neon/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/llama-4-maverick": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/meta-llama-3-1-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/meta-llama-3-3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "neon/qwen35-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "neosmith/neosmith.intelligent-basic": {
    toolCall: true,
    structuredOutput: false
  },
  "neosmith/neosmith.intelligent-maestro": {
    toolCall: true,
    structuredOutput: false
  },
  "neosmith/neosmith.intelligent-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "neosmith/neosmith.neolite": {
    toolCall: true,
    structuredOutput: false
  },
  "netlify/anthropic/claude-fable-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-fable-5-1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-haiku-4-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-haiku-4-5-20251001": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-4-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-4-5-20251101": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-4-6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-4-7": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-4-8": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-opus-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-sonnet-4-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-sonnet-4-5-20250929": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-sonnet-4-6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/anthropic/claude-sonnet-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-2.5-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-2.5-flash-image": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-2.5-flash-lite": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-2.5-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3-flash-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3-pro-image": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.1-flash-image": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.1-flash-lite": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.1-flash-lite-image": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.1-pro-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.1-pro-preview-customtools": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.5-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.5-flash-lite": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.6-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.7-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-3.8-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-flash-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/gemini/gemini-flash-lite-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/chat-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-4.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-4.1-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-4.1-nano": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-4o": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-4o-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5-2025-08-07": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5-mini-2025-08-07": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5-nano": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.1-2025-11-13": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.2-2025-12-11": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.2-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.2-pro-2025-12-11": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.3-codex": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-2026-03-05": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-mini-2026-03-17": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-nano": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-nano-2026-03-17": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.4-pro-2026-03-05": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.5-2026-04-23": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.5-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.5-pro-2026-04-23": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.6-luna": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.6-sol": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-5.6-terra": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/gpt-6-astra": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/o3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/o3-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openai/o4-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/~deepseek/deepseek-v4-flash-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/~moonshotai/kimi-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/~x-ai/grok-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/~z-ai/glm-flash-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/~z-ai/glm-latest": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/anthracite-org/magnum-v4-72b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/baidu/ernie-4.5-vl-424b-a47b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-1.6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-1.6-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-2-1-turbo": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-2.0-code": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-2.0-lite": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance-seed/seed-2.0-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/bytedance/ui-tars-1.5-7b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-chat": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-chat-v3-0324": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-chat-v3.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-r1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-r1-0528": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-r1-distill-llama-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v3.1-terminus": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v3.2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v3.2-exp": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v4-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v4-flash-0731": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v4-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/deepseek/deepseek-v4-pro-0813": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-2-27b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-3-12b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-3-27b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-3-4b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-4-26b-a4b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/google/gemma-4-31b-it": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/gryphe/mythomax-l2-13b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/ibm-granite/granite-4.2-8b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inception/mercury-2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inception/mercury-2.5-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inclusionai/ling-3.0-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inclusionai/ling-3.0-flash-fin": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inclusionai/ling-3.0-flash-fin:free": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/inclusionai/ling-3.0-flash-sante:free": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mancer/weaver": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-3.1-70b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-3.1-8b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-3.2-3b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-3.3-70b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-4-maverick": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-4-scout": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta-llama/llama-guard-4-12b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/meta/muse-glimmer-30b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/microsoft/phi-4": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/microsoft/wizardlm-2-8x22b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m2.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m2.5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m2.7": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/minimax/minimax-m3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/devstral-2512": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/ministral-14b-2512": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/ministral-3b-2512": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/ministral-8b-2512": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-large-2407": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-large-2512": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-medium-3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-medium-3-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-medium-3.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-nemo": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-saba": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-small-24b-instruct-2501": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-small-2603": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mistral-small-3.2-24b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/mixtral-8x22b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/mistralai/voxtral-small-24b-2507": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2-0905": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2-thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2.5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2.6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k2.7-code": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/moonshotai/kimi-k3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/morph/morph-v3-fast": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/morph/morph-v3-large": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nousresearch/hermes-3-llama-3.1-405b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nousresearch/hermes-3-llama-3.1-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nousresearch/hermes-4-405b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nousresearch/hermes-4-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nvidia/nemotron-3.5-content-safety": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/nvidia/nemotron-3.5-lightning": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openai/gpt-oss-120b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openai/gpt-oss-20b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openai/gpt-oss-safeguard-20b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openrouter/auto": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openrouter/auto-beta": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openrouter/free": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/openrouter/pareto-code": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perceptron/perceptron-mk1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perplexity/sonar": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perplexity/sonar-deep-research": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perplexity/sonar-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perplexity/sonar-pro-search": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/perplexity/sonar-reasoning-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen-2.5-72b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen-2.5-7b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen2.5-vl-72b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-14b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-235b-a22b-2507": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-235b-a22b-thinking-2507": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-30b-a3b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-30b-a3b-instruct-2507": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-32b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-coder": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-coder-next": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-vl-30b-a3b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3-vl-8b-instruct": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.5-122b-a10b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.5-27b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.5-35b-a3b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.5-397b-a17b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.5-9b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.6-27b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.6-35b-a3b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.8-2.4t-a95b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/qwen/qwen3.8-27b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/rekaai/reka-edge": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/rekaai/reka-flash-3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/relace/relace-apply-3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/relace/relace-search": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/sao10k/l3-lunaris-8b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/sao10k/l3.1-euryale-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/sao10k/l3.3-euryale-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/stepfun/step-3.7-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/tencent/hy-mt2-1.8b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/tencent/hy-mt2-30b-a3b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/tencent/hy-mt2-7b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/tencent/hy3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/tencent/hy4-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/thedrummer/cydonia-24b-v4.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/thedrummer/skyfall-36b-v2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/thedrummer/unslopnemo-12b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/thinkingmachines/inkling": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/thinkingmachines/inkling-small": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/undi95/remm-slerp-l2-13b": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/upstage/solar-pro4": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-4.20": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-4.20-multi-agent": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-4.3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-4.5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-4.6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/x-ai/grok-build-0.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/xiaomi/mimo-v2.5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/xiaomi/mimo-v2.5-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.5-air": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.5v": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.6": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.6v": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.7": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-4.7-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-5": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-5.1": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-5.2": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-5.3": {
    toolCall: null,
    structuredOutput: null
  },
  "netlify/openrouter/z-ai/glm-5.3-flash": {
    toolCall: null,
    structuredOutput: null
  },
  "neuralwatt/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/deepseek-v4-flash-flex": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/gemma-4-31b": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/glm-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-flex": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-short": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-short-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-short-fast-flex": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.2-short-flex": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "neuralwatt/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/kimi-k2.7-code-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/kimi-k2.7-code-flex": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/kimi-k3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/kimi-k3-flex": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/qwen-3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/qwen3.6-35b": {
    toolCall: true,
    structuredOutput: true
  },
  "neuralwatt/qwen3.6-35b-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "nova/nova-2-lite-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "nova/nova-2-pro-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/baichuan/baichuan-m2-32b": {
    toolCall: false,
    structuredOutput: false
  },
  "novita-ai/baidu/ernie-4.5-21B-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/baidu/ernie-4.5-21B-a3b-thinking": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/baidu/ernie-4.5-300b-a47b-paddle": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/baidu/ernie-4.5-vl-28b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/baidu/ernie-4.5-vl-28b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/baidu/ernie-4.5-vl-424b-a47b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-ocr": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-ocr-2": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-prover-v2-671b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-r1-0528-qwen3-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-r1-distill-llama-70b": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-r1-distill-qwen-14b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-r1-distill-qwen-32b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-r1-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v3-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v3.2-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/google/gemma-3-12b-it": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/google/gemma-3-27b-it": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/gryphe/mythomax-l2-13b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/inclusionai/ling-2.6-1t": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/inclusionai/ling-2.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/inclusionai/ring-2.6-1t": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/kwaipilot/kat-coder-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/meta-llama/llama-3-70b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/meta-llama/llama-3-8b-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/meta-llama/llama-3.1-8b-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/meta-llama/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/meta-llama/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/meta-llama/llama-4-maverick-17b-128e-instruct-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/meta-llama/llama-4-scout-17b-16e-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/microsoft/wizardlm-2-8x22b": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/minimaxai/minimax-m1-80k": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/mistralai/mistral-nemo": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k2-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/nousresearch/hermes-2-pro-llama-3-8b": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/openai/gpt-oss-20b": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/paddlepaddle/paddleocr-vl": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen-2.5-72b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen-mt-plus": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen2.5-7b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-235b-a22b-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-30b-a3b-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-32b-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-4b-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-8b-fp8": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-omni-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-omni-30b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/qwen/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-vl-30b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3-vl-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/sao10K/l3-70b-euryale-v2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/sao10K/l3-8b-lunaris": {
    toolCall: false,
    structuredOutput: true
  },
  "novita-ai/sao10K/L3-8B-stheno-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/sao10K/l31-70b-euryale-v2.2": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/xiaomimimo/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/xiaomimimo/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/xiaomimimo/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/autoglm-phone-9b-multilingual": {
    toolCall: false,
    structuredOutput: null
  },
  "novita-ai/zai-org/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/zai-org/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "novita-ai/zai-org/glm-4.5v": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-4.6v": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "novita-ai/zai-org/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/abacusai/dracarys-llama-3.1-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/baai/bge-m3": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/black-forest-labs/flux_1-kontext-dev": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/black-forest-labs/flux_1-schnell": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/black-forest-labs/flux_2-klein-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/black-forest-labs/flux.1-dev": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/bytedance/seed-oss-36b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/deepseek-ai/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/deepseek-ai/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/deepseek-ai/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/deepseek-ai/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/google/gemma-2-2b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/google/gemma-3-12b-it": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/google/gemma-3-4b-it": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/google/gemma-3n-e2b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/google/gemma-3n-e4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/google/google-paligemma": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/meta/esm2-650m": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/meta/esmfold": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/meta/llama-3.1-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/meta/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/meta/llama-3.2-11b-vision-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/meta/llama-3.2-1b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/meta/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "nvidia/meta/llama-3.2-90b-vision-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/meta/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/meta/llama-4-maverick-17b-128e-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/meta/llama-guard-4-12b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/meta/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/microsoft/phi-4-mini-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/microsoft/phi-4-multimodal-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/minimaxai/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/minimaxai/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/mistralai/magistral-small-2506": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/mistralai/ministral-14b-instruct-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/mistralai/mistral-7b-instruct-v0.3": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/mistralai/mistral-large-3-675b-instruct-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/mistralai/mistral-medium-3-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/mistralai/mistral-medium-3.5-128b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/mistralai/mistral-nemotron": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/mistralai/mistral-small-4-119b-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/mistralai/mixtral-8x22b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/mistralai/mixtral-8x7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/moonshotai/kimi-k2-instruct-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/nvidia/active-speaker-detection": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/bevformer": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/cosmos-predict1-5b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/cosmos-reason2-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/cosmos-transfer1-7b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/cosmos-transfer2_5-2b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/gliner-pii": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3_2-nemoretriever-300m-embed-v1": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.1-nemotron-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.1-nemotron-nano-8b-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.1-nemotron-nano-vl-8b-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.1-nemotron-safety-guard-8b-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.1-nemotron-ultra-253b-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.3-nemotron-super-49b-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-3.3-nemotron-super-49b-v1.5": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-nemotron-embed-vl-1b-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/llama-nemotron-rerank-vl-1b-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/magpie-tts-zeroshot": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-3-content-safety": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/nvidia/nemotron-3.5-lightning-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/nvidia/nemotron-content-safety-reasoning-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-mini-4b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-nano-12b-v2-vl": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/nemotron-voicechat": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/nv-embed-v1": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/nv-embedcode-7b-v1": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/nvidia-nemotron-nano-9b-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/nvidia/rerank-qa-mistral-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/riva-translate-4b-instruct-v1.1": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/sparsedrive": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/streampetr": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/studiovoice": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/synthetic-video-detector": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/usdcode": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/nvidia/usdvalidate": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/openai/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "nvidia/poolside/laguna-xs-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "nvidia/qwen/qwen-image": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/qwen/qwen-image-edit": {
    toolCall: false,
    structuredOutput: false
  },
  "nvidia/qwen/qwen2.5-coder-32b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/qwen/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "nvidia/sarvamai/sarvam-m": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/stepfun-ai/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/stepfun-ai/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/upstage/solar-10.7b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "nvidia/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen-max": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen-vl-max": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/bailian/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/bailian/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-pro-0423": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/minimax/m2-her": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.1-lightning": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.5-lightning": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/moonshotai/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "ofox/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-1-6": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-1-6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-1-6-vision": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-1-8": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.0-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.0-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-2.1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-character": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/volcengine/doubao-seed-evolving": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/x-ai/grok-4.1-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/x-ai/grok-4.20": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/x-ai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/z-ai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "ofox/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ofox/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/deepseek-v4-flash:0731": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/gemma4:31b": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/glm-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/gpt-oss:120b": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/gpt-oss:20b": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/kimi-k2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "ollama-cloud/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/mistral-large-3:675b": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/nemotron-3-nano:30b": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/nemotron-3-super": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/nemotron-3-ultra": {
    toolCall: true,
    structuredOutput: null
  },
  "ollama-cloud/qwen3.5:397b": {
    toolCall: true,
    structuredOutput: null
  },
  "openai/chatgpt-image-latest": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "openai/gpt-4": {
    toolCall: true,
    structuredOutput: false
  },
  "openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4o-2024-05-13": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.2-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "openai/gpt-5.3-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.3-codex-spark": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/gpt-image-1": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/gpt-image-1-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/gpt-image-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/gpt-realtime-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/o1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openai/text-embedding-3-large": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/text-embedding-3-small": {
    toolCall: false,
    structuredOutput: null
  },
  "openai/text-embedding-ada-002": {
    toolCall: false,
    structuredOutput: null
  },
  "opencode-go/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/glm-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/kimi-k2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/longcat-2.0": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/mimo-v2-omni": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/omen-alpha": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/ox-alpha-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode-go/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode-go/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/big-pickle": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/claude-3-5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-fable-5-1": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-4-1": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/deepseek-v4-flash-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-4.7-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-5-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.3-codex-spark": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/grok-code": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/hy3-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/hy3-preview-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2.5-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/laguna-s-2.1-free": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/ling-2.6-flash-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/ling-3.0-flash-fin-free": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/ling-3.0-flash-free": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/ling-3.0-tiny-free": {
    toolCall: true,
    structuredOutput: false
  },
  "opencode/longcat-2.0-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/mimo-v2-flash-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/mimo-v2-omni-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/mimo-v2-pro-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/mimo-v2.5-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m2.1-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m2.5-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/minimax-m3-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/muse-spark-1.2-contributor-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/muse-spark-1.3-contributor-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/nemotron-3-super-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/nemotron-3-ultra-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/nemotron-3.5-lightning-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/north-mini-code-free": {
    toolCall: true,
    structuredOutput: true
  },
  "opencode/qwen3-coder": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/qwen3.6-plus-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/ring-2.6-1t-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/trinity-large-preview-free": {
    toolCall: true,
    structuredOutput: null
  },
  "opencode/x-preview-f-free": {
    toolCall: true,
    structuredOutput: true
  },
  "openreason/deepseek-ai/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "openreason/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "openreason/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~anthropic/claude-fable-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~anthropic/claude-haiku-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~anthropic/claude-opus-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~anthropic/claude-sonnet-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~deepseek/deepseek-v4-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~google/gemini-pro-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~moonshotai/kimi-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~openai/gpt-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~openai/gpt-mini-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~x-ai/grok-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~z-ai/glm-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/~z-ai/glm-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/aion-labs/aion-2.0": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/aion-labs/aion-3.0": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/aion-labs/aion-3.0-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/aion-labs/aion-rp-llama-3.1-8b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/amazon/nova-2-lite-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/amazon/nova-lite-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/amazon/nova-micro-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/amazon/nova-premier-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/amazon/nova-pro-v1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/anthracite-org/magnum-v4-72b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-3-haiku": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-opus-4": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/anthropic/claude-opus-4.1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/arcee-ai/trinity-large-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/baidu/ernie-4.5-vl-424b-a47b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/bytedance-seed/seed-1.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance-seed/seed-1.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance-seed/seed-2-1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance-seed/seed-2.0-code": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance-seed/seed-2.0-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance-seed/seed-2.0-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/bytedance/ui-tars-1.5-7b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/cognitivecomputations/dolphin-mistral-24b-venice-edition": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/cohere/command-a": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/cohere/command-r-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/cohere/command-r-plus-08-2024": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/cohere/command-r7b-12-2024": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/cohere/north-mini-code:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-chat-v3-0324": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-chat-v3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-r1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-r1-distill-llama-70b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/deepseek/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v3.2-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/dots-studio/dots-3-note-preview:free": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-2.5-pro-preview-05-06": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3-pro-image": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3-pro-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-flash-lite-image": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemma-2-27b-it": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemma-3-12b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemma-3-27b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemma-3-4b-it": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemma-4-26b-a4b-it:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/google/gemma-4-31b-it:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/google/lyria-3-clip-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/google/lyria-3-pro-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/gryphe/mythomax-l2-13b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/ibm-granite/granite-4.0-h-micro": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/ibm-granite/granite-4.2-8b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/inception/mercury-2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/inception/mercury-2.5-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/inclusionai/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/inclusionai/ling-3.0-flash-fin": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/inclusionai/ling-3.0-flash-fin:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/inclusionai/ling-3.0-flash-sante:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/kwaipilot/kat-coder-pro-v2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/kwaipilot/kat-coder-pro-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/liquid/lfm-2.5-2.6b:free": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mancer/weaver": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/meituan/longcat-2.0": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/meta-llama/llama-3.1-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-3.1-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-3.2-1b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/meta-llama/llama-3.2-3b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-4-maverick": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-4-scout": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta-llama/llama-guard-4-12b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/meta/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/meta/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/microsoft/phi-4": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/microsoft/wizardlm-2-8x22b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/minimax/minimax-01": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/minimax/minimax-m1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/minimax/minimax-m2-her": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/minimax/minimax-m2.7:free": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/minimax/minimax-m3:free": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/mistralai/codestral-2508": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/devstral-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/ministral-14b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/ministral-3b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/ministral-8b-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-large": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-large-2407": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-large-2512": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-medium-3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-medium-3-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-medium-3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-nemo": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-saba": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-small-24b-instruct-2501": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-small-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mistral-small-3.1-24b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/mistralai/mistral-small-3.2-24b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/mixtral-8x22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/mistralai/voxtral-small-24b-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k2": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/morph/morph-v3-fast": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/morph/morph-v3-large": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/nex-agi/nex-n2-mini": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/nex-agi/nex-n2-pro": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/nousresearch/hermes-3-llama-3.1-405b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/nousresearch/hermes-3-llama-3.1-70b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/nousresearch/hermes-4-405b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/nousresearch/hermes-4-70b": {
    toolCall: null,
    structuredOutput: null
  },
  "openrouter/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/nvidia/nemotron-3-super-120b-a12b:free": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/nvidia/nemotron-3-ultra-550b-a55b:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/nvidia/nemotron-3.5-content-safety": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/nvidia/nemotron-3.5-content-safety:free": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/nvidia/nemotron-3.5-lightning": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/nvidia/nemotron-3.5-lightning:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/openai/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-3.5-turbo-0613": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-3.5-turbo-16k": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-3.5-turbo-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4-turbo-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o-2024-05-13": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-4o-mini-2024-07-18": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5-image": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5-image-mini": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.2-chat": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.4-image-2": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-luna-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-sol-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-5.6-terra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-6-astra-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-audio": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-audio-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/gpt-oss-safeguard-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o1-pro": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o3-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openai/o4-mini-high": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openrouter/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openrouter/bodybuilder": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/openrouter/free": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/openrouter/fusion": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/openrouter/pareto-code": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/perceptron/perceptron-mk1": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/perplexity/sonar": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/perplexity/sonar-deep-research": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/perplexity/sonar-pro-search": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/poolside/laguna-s-2.1:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/poolside/laguna-xs-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/poolside/laguna-xs-2.1:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen-2.5-72b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen-2.5-7b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen-2.5-coder-32b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/qwen/qwen-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen-plus-2025-07-28": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-14b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3-235b-a22b-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-30b-a3b-instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-30b-a3b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3-32b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-8b": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-coder-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-max-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-30b-a3b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-32b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-8b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3-vl-8b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-flash-02-23": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-plus-02-15": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.5-plus-20260420": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/qwen/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/rekaai/reka-edge": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/rekaai/reka-flash-3": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/relace/relace-apply-3": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/relace/relace-search": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/sakana/sakana-namazu": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/sao10k/l3-lunaris-8b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/sao10k/l3.1-euryale-70b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/sao10k/l3.3-euryale-70b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/stepfun/step-3.5-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/tencent/hunyuan-a13b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/tencent/hy-mt2-1.8b": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/tencent/hy-mt2-30b-a3b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/tencent/hy-mt2-7b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/tencent/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/tencent/hy3-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/tencent/hy4-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/thedrummer/cydonia-24b-v4.1": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/thedrummer/skyfall-36b-v2": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/thedrummer/unslopnemo-12b": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/thinkingmachines/inkling-small:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/thinkingmachines/inkling:free": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/undi95/remm-slerp-l2-13b": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/upstage/solar-pro-3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/upstage/solar-pro4": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/writer/palmyra-x5": {
    toolCall: false,
    structuredOutput: false
  },
  "openrouter/x-ai/grok-4.20": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/x-ai/grok-4.20-multi-agent": {
    toolCall: false,
    structuredOutput: true
  },
  "openrouter/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/x-ai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/z-ai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/z-ai/glm-4.5v": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-4.6v": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "openrouter/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "openrouter/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "opper/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/gemini/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/gemini/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/gemini/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/gemini/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/minimax/m3": {
    toolCall: true,
    structuredOutput: null
  },
  "opper/mistral/devstral-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "opper/mistral/mistral-large-2512": {
    toolCall: true,
    structuredOutput: null
  },
  "opper/mistral/mistral-small-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "opper/moonshot/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.3-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "opper/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/perplexity/sonar": {
    toolCall: false,
    structuredOutput: null
  },
  "opper/perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "opper/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "opper/vertexai/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/vertexai/gemini-3.7-flash-eu": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/xai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/xai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "opper/xai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/deepseek/deepseek-reasoner": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/deepseek/deepseek-v4-flash-free": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.1-pro-preview-customtools": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-flash-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-flash-lite-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemini-robotics-er-1.6-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/grok/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/grok/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/grok/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/kimi/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/kimi/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/kimi/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/kimi/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "orcarouter/openai/gpt-4": {
    toolCall: true,
    structuredOutput: false
  },
  "orcarouter/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "orcarouter/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4o-2024-05-13": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4o-2024-08-06": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4o-2024-11-20": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5-chat-latest": {
    toolCall: false,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.1-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.2-chat-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "orcarouter/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "orcarouter/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/orcarouter/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/orcarouter/free": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/orcarouter/fusion": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/orcarouter/fusion-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/orcarouter/fusion-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3-vl-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/qwen/qwen3.8-27b-free": {
    toolCall: null,
    structuredOutput: null
  },
  "orcarouter/qwen/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/tencent/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/tencent/hy3-free": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "orcarouter/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "orcarouter/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/meta-llama-3_3-70b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/mistral-7b-instruct-v0.3": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/mistral-nemo-instruct-2407": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/mistral-small-3.2-24b-instruct-2506": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen2.5-vl-72b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "ovhcloud/qwen3-32b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "ovhcloud/qwen3guard-gen-0.6b": {
    toolCall: false,
    structuredOutput: null
  },
  "ovhcloud/qwen3guard-gen-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "pendra/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pendra/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "pendra/gpt-oss:120b": {
    toolCall: true,
    structuredOutput: true
  },
  "pendra/llama3.3:70b": {
    toolCall: true,
    structuredOutput: null
  },
  "pendra/qwen3-coder:30b": {
    toolCall: true,
    structuredOutput: null
  },
  "pendra/qwen3.6:27b": {
    toolCall: true,
    structuredOutput: true
  },
  "perplexity/sonar": {
    toolCall: false,
    structuredOutput: null
  },
  "perplexity/sonar-deep-research": {
    toolCall: false,
    structuredOutput: null
  },
  "perplexity/sonar-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/anthropic/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "perplexity-agent/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/moonshot-ai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "perplexity-agent/moonshot-ai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "perplexity-agent/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/perplexity/sonar": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/xai/grok-4-1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "perplexity-agent/xai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/claude-3-7-sonnet-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-4-1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/devstral-2": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliguard-LLMGuardrails-300M": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliner2-base-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliner2-large-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliner2-multi-large-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliner2-multi-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/fastino/gliner2-privacy-filter-PII-multi": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/gemini-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gemini-3.1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/google/diffusiongemma-26B-A4B-it": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/google/gemma-3-4b-pt": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/google/gemma-4-12B-it": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/google/gemma-4-E2B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/google/gemma-4-E4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/HuggingFaceTB/SmolLM3-3B-Base": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/LiquidAI/LFM2-24B-A2B": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.1-8B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.2-1B": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.2-1B-Instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.2-3B": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.2-3B-Instruct": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistral-large-3": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistral-medium-3.5": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/mistralai/Codestral-22B-v0.1": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/mistralai/Magistral-Small-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistralai/Ministral-8B-Instruct-2410": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistralai/Mistral-7B-Instruct-v0.3": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistralai/Mistral-Nemo-Instruct-2407": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistralai/Mistral-Small-4-119B-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/mistralai/Pixtral-12B-2409": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/nvidia/NVIDIA-Nemotron-3-Nano-30B-A3B-BF16": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B-BF16": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/pioneer/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "pioneer/Qwen/Qwen2.5-Coder-0.5B": {
    toolCall: false,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-1.7B-Base": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-4B-Base": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-4B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3-8B": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/qwen3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/qwen3.6-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/XiaomiMiMo/MiMo-V2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/XiaomiMiMo/MiMo-V2.5-Pro": {
    toolCall: true,
    structuredOutput: null
  },
  "pioneer/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "pioneer/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "poe/anthropic/claude-haiku-3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-haiku-3.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-3.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-3.5-june": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-3.7": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/cerebras/gpt-oss-120b-cs": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/cerebras/llama-3.1-8b-cs": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/cerebras/llama-3.3-70b-cs": {
    toolCall: false,
    structuredOutput: null
  },
  "poe/cerebras/qwen3-235b-2507-cs": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/cerebras/qwen3-32b-cs": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/elevenlabs/elevenlabs-music": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/elevenlabs/elevenlabs-v2.5-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/elevenlabs/elevenlabs-v3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/empiriolabs/deepseek-v4-flash-el": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/empiriolabs/deepseek-v4-pro-el": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/fireworks-ai/kimi-k2.5-fw": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-2.0-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-2.0-flash-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-3-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-3-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-3.1-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "poe/google/gemini-deep-research": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/gemma-4-31b": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/imagen-3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/imagen-3-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/imagen-4": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/imagen-4-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/imagen-4-ultra": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/lyria": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/nano-banana": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/nano-banana-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/veo-2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/veo-3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/veo-3-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/veo-3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/google/veo-3.1-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/ideogramai/ideogram": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/ideogramai/ideogram-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/ideogramai/ideogram-v2a": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/ideogramai/ideogram-v2a-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/lumalabs/ray2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-4.7-n": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/kimi-k2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/novita/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/chatgpt-4o-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/dall-e-3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-3.5-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-3.5-turbo-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-3.5-turbo-raw": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4-classic": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4-classic-0314": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4o-aug": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4o-mini-search": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-4o-search": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.1-instant": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.2-instant": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.3-codex-spark": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.3-instant": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "poe/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "poe/openai/gpt-image-1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-image-1-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/gpt-image-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "poe/openai/gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "poe/openai/o1": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o1-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o3-deep-research": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o3-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o3-mini-high": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o3-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o4-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/o4-mini-deep-research": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/sora-2": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/openai/sora-2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/poetools/claude-code": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/runwayml/runway": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/runwayml/runway-gen-4-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/stabilityai/stablediffusionxl": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/topazlabs-co/topazlabs": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/trytako/tako": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-3": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-3-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4.1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4.1-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-4.20-multi-agent": {
    toolCall: true,
    structuredOutput: null
  },
  "poe/xai/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: null
  },
  "poolside/poolside/laguna-m.1": {
    toolCall: true,
    structuredOutput: false
  },
  "poolside/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "poolside/poolside/laguna-xs-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "privatemode-ai/deepseek-ocr-2": {
    toolCall: false,
    structuredOutput: null
  },
  "privatemode-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "privatemode-ai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "privatemode-ai/kimi-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "privatemode-ai/qwen3-embedding-4b": {
    toolCall: false,
    structuredOutput: false
  },
  "privatemode-ai/voxtral-mini-3b": {
    toolCall: false,
    structuredOutput: false
  },
  "privatemode-ai/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "qihang-ai/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "qihang-ai/claude-opus-4-5-20251101": {
    toolCall: true,
    structuredOutput: null
  },
  "qihang-ai/claude-sonnet-4-5-20250929": {
    toolCall: true,
    structuredOutput: null
  },
  "qihang-ai/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "qihang-ai/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "qihang-ai/gemini-3-pro-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "qihang-ai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "qihang-ai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "qihang-ai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "qiniu-ai/claude-3.5-haiku": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-3.5-sonnet": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-3.7-sonnet": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.0-opus": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.0-sonnet": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.1-opus": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.5-haiku": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.5-opus": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/claude-4.5-sonnet": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek-r1": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek-v3": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/deepseek-v3-0324": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-math-v2": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-v3.1-terminus-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-v3.2-251201": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-v3.2-exp": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/deepseek/deepseek-v3.2-exp-thinking": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/doubao-1.5-pro-32k": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-1.5-thinking-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-1.5-vision-pro": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-1.6": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-1.6-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-1.6-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-2.0-code": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-2.0-lite": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-2.0-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/doubao-seed-2.0-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.0-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.0-flash-lite": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-3.0-flash-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gemini-3.0-pro-image-preview": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/gemini-3.0-pro-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/glm-4.5": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/kimi-k2": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/kling-v2-6": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/meituan/longcat-flash-chat": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/meituan/longcat-flash-lite": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "qiniu-ai/MiniMax-M1": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/openai/gpt-5": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen-max-2025-01-25": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen-vl-max-2025-01-25": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen2.5-vl-72b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen2.5-vl-7b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-235b-a22b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-235b-a22b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-30b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-30b-a3b-instruct-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-30b-a3b-thinking-2507": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-32b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-coder-480b-a35b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-max": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-max-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3-vl-30b-a3b-thinking": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/stepfun-ai/gelab-zero-4b-preview": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/stepfun/step-3.5-flash": {
    toolCall: false,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4-fast-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4.1-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4.1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-4.1-fast-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/x-ai/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/xiaomi/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "qiniu-ai/z-ai/autoglm-phone-9b": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: false
  },
  "qiniu-ai/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: false
  },
  "regolo-ai/apertus-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/brick-complexity-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/brick-v1-beta": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/deepseek-ocr-2": {
    toolCall: false,
    structuredOutput: null
  },
  "regolo-ai/faster-whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "regolo-ai/gemma4-31b": {
    toolCall: true,
    structuredOutput: true
  },
  "regolo-ai/glm5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "regolo-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/mistral-small-4-119b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/qwen-image": {
    toolCall: false,
    structuredOutput: null
  },
  "regolo-ai/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/qwen3-embedding-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "regolo-ai/qwen3-reranker-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "regolo-ai/qwen3.5-122b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: null
  },
  "regolo-ai/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-fable-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-fable-5.1@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-fable-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-haiku-4-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-1": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-6@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-7@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-4-8@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-opus-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-4-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-4-6@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-4@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/claude-sonnet-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-flash-0731@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-pro-0813@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/deepseek-v4-pro@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/devstral-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/devstral-latest@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/fugu-ultra": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/gemini-2.5-flash-lite@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-2.5-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-2.5-pro@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3-pro-image": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.1-flash-image": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.1-flash-lite@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.5-flash-lite@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.5-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.7-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemini-3.8-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/glm-5.1": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/glm-5.1@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/glm-5.2@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/glm-5.3": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/glm-5.3-flash@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/glm-5.3@eu": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/gpt-4.1-mini@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-4.1-nano@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-4.1@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-4o-mini@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5-mini@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5-nano@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.1@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.4@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-luna@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-sol@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5.6-terra@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/gpt-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/grok-4.2-beta": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/hy3": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/inkling": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/inkling-256k": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/kat-coder-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/kimi-k2.6@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/kimi-k2.7-code@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/kimi-k3@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/laguna-m.1": {
    toolCall: false,
    structuredOutput: false
  },
  "requesty/laguna-xs.2": {
    toolCall: false,
    structuredOutput: false
  },
  "requesty/leanstral-1-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/leanstral-1-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/ling-2.6-1t": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/ling-2.6-flash": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/ling-3.0-tiny": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/mimo-v2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/minimax-m2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/minimax-m3": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/minimax-m3@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-medium-3-5": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-medium-3-5@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-medium-latest": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-medium-latest@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-small-2603": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/mistral-small-2603@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-3-nano-omni": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/nemotron-3-nano-omni-30b-a3b-reasoning": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-3-nano-omni@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-3-ultra-nvfp4": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-3.5-content-safety": {
    toolCall: false,
    structuredOutput: false
  },
  "requesty/nemotron-3.5-lightning-30b-a3b": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/nemotron-lightning-3.5-30b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/nvidia-nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/nvidia-nemotron-3-ultra": {
    toolCall: false,
    structuredOutput: false
  },
  "requesty/o4-mini@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.5-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.5-2b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.5-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.7-max": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-2.4T-A95B": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-2.4T-A95B@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-flash-next": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-flash-next@eu": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/qwen3.8-max": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/ring-2.6-1t": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/seed-1.8": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/seed-2.0-code": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/seed-2.0-mini": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/seed-2.0-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/step-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "requesty/thinkingcap-qwen3.6-27b": {
    toolCall: true,
    structuredOutput: false
  },
  "requesty/thinkingcap-qwen3.6-27b@eu": {
    toolCall: true,
    structuredOutput: false
  },
  "routing-run/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "routing-run/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "routing-run/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/glm-5.2-nitro": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/kimi-k2.6-nitro": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/kimi-k2.7-code-nitro": {
    toolCall: true,
    structuredOutput: true
  },
  "routing-run/nemotron-3-ultra": {
    toolCall: true,
    structuredOutput: null
  },
  "routing-run/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/Inferact/Qwen3.8-2.4T-A95B-NVFP4": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B-BF16": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/ornith-ai/Ornith-1.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/Qwen/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "runinfra/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "sakana/fugu": {
    toolCall: true,
    structuredOutput: true
  },
  "sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "sakana/fugu-ultra-20260615": {
    toolCall: true,
    structuredOutput: true
  },
  "sakana/sakana-namazu": {
    toolCall: true,
    structuredOutput: true
  },
  "sarvam/sarvam-105b": {
    toolCall: true,
    structuredOutput: null
  },
  "sarvam/sarvam-30b": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/bge-multilingual-gemma2": {
    toolCall: false,
    structuredOutput: null
  },
  "scaleway/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/llama-3.3-70b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/mistral-medium-3.5-128b": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/mistral-small-3.2-24b-instruct-2506": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/pixtral-12b-2409": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/qwen3-235b-a22b-instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "scaleway/qwen3-embedding-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "scaleway/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "scaleway/whisper-large-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "scnet-token-plan/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/GLM-5": {
    toolCall: true,
    structuredOutput: null
  },
  "scnet-token-plan/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/MiMo-V2.5-Pro": {
    toolCall: true,
    structuredOutput: null
  },
  "scnet-token-plan/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "scnet-token-plan/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "scnet-token-plan/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "scnet-token-plan/Qwen3.8-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "scnet-token-plan/Qwen3.8-Max": {
    toolCall: true,
    structuredOutput: null
  },
  "scx-ai/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "scx-ai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "scx-ai/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "scx-ai/Qwen3.8-Max": {
    toolCall: true,
    structuredOutput: true
  },
  "sensenova/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "sensenova/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "sensenova/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "sensenova/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "sensenova/sensenova-6.8-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/baidu/ERNIE-4.5-300B-A47B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/ByteDance-Seed/Seed-OSS-36B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V3.1-Terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V3.2-Exp": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/google/gemma-4-26B-A4B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/inclusionAI/Ling-flash-2.0": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: false
  },
  "siliconflow/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen2.5-72B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen2.5-7B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-14B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-8B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-Coder-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-Coder-480B-A35B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-235B-A22B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-30B-A3B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-32B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-32B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3-VL-8B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.5-122B-A10B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.5-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/stepfun-ai/Step-3.5-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/tencent/Hunyuan-A13B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/tencent/Hy3-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow/zai-org/GLM-4.5-Air": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow/zai-org/GLM-5V-Turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/baidu/ERNIE-4.5-300B-A47B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/ByteDance-Seed/Seed-OSS-36B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-OCR": {
    toolCall: false,
    structuredOutput: null
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-V3.1-Terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: false
  },
  "siliconflow-cn/inclusionAI/Ling-flash-2.0": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/PaddlePaddle/PaddleOCR-VL-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "siliconflow-cn/Pro/deepseek-ai/DeepSeek-R1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/deepseek-ai/DeepSeek-V3.1-Terminus": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/deepseek-ai/DeepSeek-V3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Pro/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen2.5-72B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen2.5-7B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-14B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-32B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-8B": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-Coder-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-Coder-480B-A35B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-235B-A22B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-235B-A22B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-30B-A3B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-30B-A3B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-32B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-32B-Thinking": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3-VL-8B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/Qwen/Qwen3.5-122B-A10B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.5-27B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.5-4B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "siliconflow-cn/stepfun-ai/Step-3.5-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/tencent/Hunyuan-A13B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/zai-org/GLM-4.5-Air": {
    toolCall: true,
    structuredOutput: true
  },
  "siliconflow-cn/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-opus-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-opus-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-opus-4-7": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-sonnet-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/gemini-3.1-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/mistral-large2": {
    toolCall: true,
    structuredOutput: null
  },
  "snowflake-cortex/openai-gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/openai-gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "snowflake-cortex/snowflake-llama3.3-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "stackit/cortecs/Llama-3.3-70B-Instruct-FP8-Dynamic": {
    toolCall: true,
    structuredOutput: false
  },
  "stackit/google/gemma-3-27b-it": {
    toolCall: false,
    structuredOutput: false
  },
  "stackit/intfloat/e5-mistral-7b-instruct": {
    toolCall: false,
    structuredOutput: false
  },
  "stackit/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: false
  },
  "stackit/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: false
  },
  "stackit/Qwen/Qwen3-VL-235B-A22B-Instruct-FP8": {
    toolCall: true,
    structuredOutput: false
  },
  "stackit/Qwen/Qwen3-VL-Embedding-8B": {
    toolCall: false,
    structuredOutput: false
  },
  "stackit/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: false
  },
  "standardcompute/standardcompute": {
    toolCall: true,
    structuredOutput: true
  },
  "stepfun/step-1-32k": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun/step-2-16k": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun/step-3.5-flash-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun/step-tts-2": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun/stepaudio-2.5-asr": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun/stepaudio-2.5-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun-ai/step-1-32k": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai/step-2-16k": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai/step-3.5-flash-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai/step-tts-2": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun-ai/stepaudio-2.5-asr": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun-ai/stepaudio-2.5-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "stepfun-step-plan/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-step-plan/step-3.5-flash-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-step-plan/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-step-plan/step-router-v1": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai-step-plan/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai-step-plan/step-3.5-flash-2603": {
    toolCall: true,
    structuredOutput: null
  },
  "stepfun-ai-step-plan/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "subconscious/subconscious/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "subconscious/subconscious/tim-qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "submodel/deepseek-ai/DeepSeek-R1-0528": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/deepseek-ai/DeepSeek-V3-0324": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/Qwen/Qwen3-235B-A22B-Instruct-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/Qwen/Qwen3-235B-A22B-Thinking-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/zai-org/GLM-4.5-Air": {
    toolCall: true,
    structuredOutput: null
  },
  "submodel/zai-org/GLM-4.5-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "synthetic/hf:MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "synthetic/hf:moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "synthetic/hf:moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "synthetic/hf:nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-NVFP4": {
    toolCall: true,
    structuredOutput: null
  },
  "synthetic/hf:openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "synthetic/hf:Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "synthetic/hf:zai-org/GLM-4.7-Flash": {
    toolCall: true,
    structuredOutput: null
  },
  "synthetic/hf:zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "synthetic/hf:zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tencent-coding-plan/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/hunyuan-2.0-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/hunyuan-2.0-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/hunyuan-t1": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/hunyuan-turbos": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-coding-plan/tc-code-latest": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-token-plan/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-token-plan/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-tokenhub/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-tokenhub/hy3-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "tencent-tokenhub/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/deepseek/deepseek-chat-v3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/deepseek/deepseek-r1-0528": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/qwen/qwen3-235b-a22b-2507": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/qwen/qwen3-coder-30b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/qwen/qwen3-vl-235b-a22b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/qwen/qwen3.5-122b-a10b": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/qwen/qwen3.5-9b": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "tensorx/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "tensorx/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "the-grid-ai/agent-max": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/agent-prime": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/agent-standard": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/code-max": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/code-prime": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/code-standard": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/text-max": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/text-prime": {
    toolCall: true,
    structuredOutput: true
  },
  "the-grid-ai/text-standard": {
    toolCall: true,
    structuredOutput: true
  },
  "thinkingmachines/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "thinkingmachines/thinkingmachines/Inkling:peft:262144": {
    toolCall: true,
    structuredOutput: null
  },
  "tinfoil/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/gemma4-31b": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/glm-5-3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/gpt-oss-safeguard-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "tinfoil/llama3-3-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "tinfoil/nomic-embed-text": {
    toolCall: false,
    structuredOutput: false
  },
  "togetherai/deepcogito/cogito-v2-1-671b": {
    toolCall: false,
    structuredOutput: null
  },
  "togetherai/deepseek-ai/DeepSeek-R1": {
    toolCall: false,
    structuredOutput: null
  },
  "togetherai/deepseek-ai/DeepSeek-V3": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/deepseek-ai/DeepSeek-V3-1": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/essentialai/Rnj-1-Instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/google/gemma-3n-E4B-it": {
    toolCall: false,
    structuredOutput: true
  },
  "togetherai/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/LiquidAI/LFM2-24B-A2B": {
    toolCall: false,
    structuredOutput: null
  },
  "togetherai/meta-llama/Llama-3.3-70B-Instruct-Turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/meta-llama/Meta-Llama-3-8B-Instruct-Lite": {
    toolCall: false,
    structuredOutput: null
  },
  "togetherai/MiniMaxAI/MiniMax-M2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/moonshotai/Kimi-K2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/moonshotai/Kimi-K3": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/pearl-ai/gemma-4-31b-it": {
    toolCall: false,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen2.5-7B-Instruct-Turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/Qwen/Qwen3-235B-A22B-Instruct-2507-tput": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen3-Coder-480B-A35B-Instruct-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen3-Coder-Next-FP8": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen3.5-9B": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/Qwen/Qwen3.6-Plus": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/Qwen/Qwen3.7-Max": {
    toolCall: true,
    structuredOutput: null
  },
  "togetherai/thinkingmachines/Inkling": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/zai-org/GLM-5": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/zai-org/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/zai-org/GLM-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "togetherai/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "tokengo/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "tokengo/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/qwen/qwen3.5-397b-a17b": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "tokengo/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/z-ai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "tokengo/z-ai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "tokenrouter/z-ai/glm-5.3-free": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/auto": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/cheap": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/e2e": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/fast": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/synth": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/synth-code": {
    toolCall: true,
    structuredOutput: true
  },
  "trustedrouter/trustedrouter/zdr": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-kimi-k2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai/umans-kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-kimi-k2.7": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "umans-ai-coding-plan/umans-qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/claude-haiku-4-5-20251001": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/deepseek-v4-flash:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/deepseek-v4-pro:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gemma-4-31b-it:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/glm-4.5-flash:free": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/glm-5.2:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gpt-5.4:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/gpt-5.5:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/minimax-m2.7:free": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/nemotron-3-ultra-550b-a55b:free": {
    toolCall: true,
    structuredOutput: null
  },
  "unorouter/qwen3.5-397b-a17b:free": {
    toolCall: true,
    structuredOutput: true
  },
  "unorouter/step-3.7-flash:free": {
    toolCall: true,
    structuredOutput: null
  },
  "upstage/solar-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "upstage/solar-pro2": {
    toolCall: true,
    structuredOutput: null
  },
  "upstage/solar-pro3": {
    toolCall: true,
    structuredOutput: null
  },
  "upstage/solar-pro4": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "vancine/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/MiniMax-M3": {
    toolCall: true,
    structuredOutput: null
  },
  "vancine/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vancine/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen-3-14b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen-3-235b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen-3-30b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen-3-32b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen-3.6-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-235b-a22b-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-coder": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-coder-30b-a3b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-coder-next": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-embedding-0.6b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-embedding-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-embedding-8b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-max-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-max-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-next-80b-a3b-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-next-80b-a3b-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-vl-235b-a22b-instruct": {
    toolCall: false,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3-vl-instruct": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3-vl-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.6-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.8-2.4t-a95b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.8-27b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.8-flash-next": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/alibaba/qwen3.8-max": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/qwen3.8-max-0902": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.5-t2v-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.6-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.6-i2v-flash": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.6-r2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.6-r2v-flash": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.6-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.7-r2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v2.7-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v3.0-video": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/alibaba/wan-v3.0-video-prime": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/amazon/nova-2-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/amazon/nova-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/amazon/nova-micro": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/amazon/nova-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/amazon/titan-embed-text-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/anthropic/claude-3-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-fable-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-4.8-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-opus-5-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/arcee-ai/trinity-large-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/bfl/flux-2-flex": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-2-klein-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-2-klein-9b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-2-max": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-2-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-3-video": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-kontext-max": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-kontext-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-pro-1.0-fill": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-pro-1.1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bfl/flux-pro-1.1-ultra": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seed-1.6": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/bytedance/seed-1.8": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-2.0-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-2.0-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-2.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-v1.0-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-v1.0-pro-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedance-v1.5-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedream-4.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedream-4.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedream-5.0-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/bytedance/seedream-5.0-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/cohere/command-a": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/cohere/embed-v4.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/cohere/rerank-v3.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/cohere/rerank-v4-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/cohere/rerank-v4-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/deepseek/deepseek-r1": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/deepseek/deepseek-v3.1": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/deepseek/deepseek-v3.1-terminus": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/deepseek/deepseek-v3.2": {
    toolCall: false,
    structuredOutput: true
  },
  "vercel/deepseek/deepseek-v3.2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/deepseek/deepseek-v4-flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/deepseek/deepseek-v4-flash-vision-exp": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/deepseek/deepseek-v4-pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/fish-audio/s1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/s1-free": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/s2-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/s2-pro-free": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/s2.1-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/s2.1-pro-free": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/transcribe-1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/fish-audio/transcribe-1-free": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-2.5-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/google/gemini-3-pro-image": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-3.1-flash-image": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-3.1-flash-image-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.1-flash-lite-image": {
    toolCall: false,
    structuredOutput: false
  },
  "vercel/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.5-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.5-transcribe": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-3.5-transcribe-live": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-3.6-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-3.8-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemini-embedding-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-embedding-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemini-omni-flash-preview": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/gemma-4-26b-a4b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/gemma-4-31b-it": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/google/text-embedding-005": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/text-multilingual-embedding-002": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/veo-3.0-fast-generate-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/veo-3.0-generate-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/veo-3.1-fast-generate-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/veo-3.1-generate-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/google/veo-3.1-lite-generate-001": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/inception/mercury-2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inception/mercury-coder-small": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inclusionai/ling-3.0-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inclusionai/ling-3.0-flash-fin": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inclusionai/ling-3.0-flash-fin-free": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inclusionai/ling-3.0-flash-sante": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/inclusionai/ling-3.0-flash-sante-free": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/interfaze/interfaze-beta": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v2.5-turbo-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v2.5-turbo-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v2.6-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v2.6-motion-control": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v2.6-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v3.0-i2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v3.0-motion-control": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/klingai/kling-v3.0-t2v": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/kwaipilot/kat-coder-air-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/kwaipilot/kat-coder-pro-v1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/kwaipilot/kat-coder-pro-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/kwaipilot/kat-coder-pro-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/llama-3.1-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/llama-3.1-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/llama-3.3-70b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/llama-4-maverick": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/llama-4-scout": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/muse-glimmer-30b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/meta/muse-image-1.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/meta/muse-spark-1.1": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/meta/muse-spark-1.2": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/meta/muse-spark-1.2-contributor": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/meta/muse-spark-1.3": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/meta/muse-spark-1.3-contributor": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-h3": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/minimax/minimax-h3-max": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.1-lightning": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.5-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/codestral": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/codestral-embed": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/mistral/devstral-2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/devstral-small-2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/ministral-14b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/mistral/ministral-3b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/ministral-8b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/mistral-embed": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/mistral/mistral-large-3": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/mistral/mistral-medium": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/mistral-medium-3.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/mistral-nemo": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/mistral-small": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/mistral/pixtral-12b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/moonshotai/kimi-k2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/moonshotai/kimi-k2.7-code-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/moonshotai/kimi-k3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/morph/morph-v3-fast": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/morph/morph-v3-large": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/nvidia/nemotron-3-nano-30b-a3b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/nvidia/nemotron-3-super-120b-a12b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/nvidia/nemotron-3-ultra-550b-a55b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/nvidia/nemotron-3.5-lightning": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/nvidia/nemotron-nano-12b-v2-vl": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/nvidia/nemotron-nano-9b-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/openai/gpt-3.5-turbo": {
    toolCall: false,
    structuredOutput: false
  },
  "vercel/openai/gpt-4-turbo": {
    toolCall: true,
    structuredOutput: false
  },
  "vercel/openai/gpt-4.1": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4.1-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4.1-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4.1-mini-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4.1-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4.1-nano-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4o": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4o-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4o-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4o-mini-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-4o-mini-transcribe": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-4o-transcribe": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-5": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-mini-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.1-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/openai/gpt-5.1-thinking-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.2-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "vercel/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.3-codex-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4-mini-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: false
  },
  "vercel/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.5-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-luna-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-sol-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-5.6-terra-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-6-astra-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-image-1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-image-1-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-image-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-image-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-oss-safeguard-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/gpt-oss-safeguard-20b": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/openai/gpt-realtime-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-realtime-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-realtime-2.1": {
    toolCall: false,
    structuredOutput: false
  },
  "vercel/openai/gpt-realtime-mini": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/gpt-realtime-whisper": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/o1": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o3": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o3-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o3-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/o4-mini-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/openai/text-embedding-3-large": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/text-embedding-3-small": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/text-embedding-ada-002": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/tts-1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/tts-1-hd": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/openai/whisper-1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/perplexity/pplx-embed-v1-0.6b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/perplexity/pplx-embed-v1-4b": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/perplexity/sonar": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/perplexity/sonar-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/perplexity/sonar-reasoning-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/poolside/laguna-s-2.1": {
    toolCall: true,
    structuredOutput: false
  },
  "vercel/poolside/laguna-s-2.1-free": {
    toolCall: true,
    structuredOutput: false
  },
  "vercel/prodia/flux-fast-schnell": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/quiverai/arrow-1.1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v3": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4.1": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4.1-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4.1-utility": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/recraft/recraft-v4.1-utility-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/sakana/fugu-ultra": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/sakana/namazu": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.1-fast-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-multi-agent": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-multi-agent-beta": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-non-reasoning-beta": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.20-reasoning-beta": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/spacexai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/spacexai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/spacexai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/spacexai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/spacexai/grok-imagine-image": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-imagine-image-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-imagine-video": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-imagine-video-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-imagine-video-1.5-preview": {
    toolCall: null,
    structuredOutput: null
  },
  "vercel/spacexai/grok-stt": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-voice-think-fast-1.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/spacexai/grok-voice-think-fast-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/stepfun/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/tencent/hy-mt2-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/tencent/hy-mt2-plus": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/tencent/hy-mt2-pro": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/tencent/hy3": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/tencent/hy4-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/thinkingmachines/inkling": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/thinkingmachines/inkling-small": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/voyage/rerank-2.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/rerank-2.5-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-3-large": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-3.5": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-3.5-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-4": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-4-large": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-4-lite": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-code-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-code-3": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-finance-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/voyage/voyage-law-2": {
    toolCall: false,
    structuredOutput: null
  },
  "vercel/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/xiaomi/mimo-v2.5-pro-ultraspeed": {
    toolCall: null,
    structuredOutput: null
  },
  "vercel/zai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.5v": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "vercel/zai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.2-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.3-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vercel/zai/glm-5.3-promo-50": {
    toolCall: null,
    structuredOutput: null
  },
  "vercel/zai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "vivgrid/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "vivgrid/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gemini-3.7-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "vivgrid/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.1-codex-max": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "vivgrid/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/gpt-6-astra": {
    toolCall: true,
    structuredOutput: true
  },
  "vivgrid/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/deepseek-v4-flash-ga-260731": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/deepseek-v4-pro-ga-260813": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-1-6-251015": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-1-6-flash-250828": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-1-6-vision-250815": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-1-8-251228": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-0-code-preview-260215": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-0-lite-260428": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-0-mini-260428": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-0-pro-260215": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-1-pro-260628": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-2-1-turbo-260628": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-character-260628": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/doubao-seed-evolving": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine/glm-5-2-260617": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/doubao-seed-2.0-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/doubao-seed-2.1-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/doubao-seed-evolving": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "volcengine-coding-plan/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "vultr/MiniMaxAI/MiniMax-M2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "vultr/nvidia/DeepSeek-V3.2-NVFP4": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/nvidia/Nemotron-Cascade-2-30B-A3B": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/Qwen/Qwen3.5-397B-A17B": {
    toolCall: true,
    structuredOutput: true
  },
  "vultr/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "vultr/XiaomiMiMo/MiMo-V2.5-Pro": {
    toolCall: true,
    structuredOutput: null
  },
  "vultr/zai-org/GLM-5.2-FP8": {
    toolCall: true,
    structuredOutput: true
  },
  "wafer.ai/GLM-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "wafer.ai/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "wafer.ai/glm5.2-fast": {
    toolCall: true,
    structuredOutput: true
  },
  "wafer.ai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "wafer.ai/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/deepseek-ai/DeepSeek-V3.1": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/deepseek-ai/DeepSeek-V4-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/deepseek-ai/DeepSeek-V4-Flash-0731": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/deepseek-ai/DeepSeek-V4-Pro": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/deepseek-ai/DeepSeek-V4-Pro-0813": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/google/gemma-4-31B-it": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/ibm-granite/granite-4.1-8b": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/ibm-granite/granite-4.2-8b": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/JetBrains/Mellum2-12B-A2.5B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/meta-llama/Llama-3.1-70B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/meta-llama/Llama-3.1-8B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/meta-llama/Llama-3.3-70B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/MiniMaxAI/MiniMax-M3": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/moonshotai/Kimi-K2.6": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/moonshotai/Kimi-K2.7-Code": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/nvidia/NVIDIA-Nemotron-3-Ultra-550B-A55B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/nvidia/NVIDIA-Nemotron-3.5-Lightning-30B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/openai/gpt-oss-120b": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/openai/gpt-oss-20b": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/OpenPipe/Qwen3-14B-Instruct": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/Qwen/Qwen3-30B-A3B-Instruct-2507": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/Qwen/Qwen3.5-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/Qwen/Qwen3.6-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/Qwen/Qwen3.6-35B-A3B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/Qwen/Qwen3.8-27B": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/zai-org/GLM-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "wandb/zai-org/GLM-5.3-Flash": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-4.20-0309-non-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-4.20-0309-reasoning": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-4.20-multi-agent-0309": {
    toolCall: false,
    structuredOutput: true
  },
  "xai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-4.6": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "xai/grok-imagine-image": {
    toolCall: false,
    structuredOutput: null
  },
  "xai/grok-imagine-image-2.0": {
    toolCall: false,
    structuredOutput: null
  },
  "xai/grok-imagine-image-quality": {
    toolCall: false,
    structuredOutput: null
  },
  "xai/grok-imagine-video": {
    toolCall: false,
    structuredOutput: null
  },
  "xai/grok-imagine-video-1.5": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi/mimo-v2-omni": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi/mimo-v2.5-pro-ultraspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2.5-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2.5-tts-voiceclone": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-cn/mimo-v2.5-tts-voicedesign": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2.5-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2.5-tts-voiceclone": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-ams/mimo-v2.5-tts-voicedesign": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2.5-tts": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2.5-tts-voiceclone": {
    toolCall: false,
    structuredOutput: null
  },
  "xiaomi-token-plan-sgp/mimo-v2.5-tts-voicedesign": {
    toolCall: false,
    structuredOutput: null
  },
  "xpersona/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "xpersona/claude-haiku-4-5": {
    toolCall: true,
    structuredOutput: null
  },
  "xpersona/claude-opus-4-8": {
    toolCall: true,
    structuredOutput: null
  },
  "xpersona/claude-sonnet-4-6": {
    toolCall: true,
    structuredOutput: null
  },
  "xpersona/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.4": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.6": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/xpersona-frieren-coder": {
    toolCall: true,
    structuredOutput: true
  },
  "xpersona/xpersona-gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.5v": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "zai-coding-plan/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zai-coding-plan/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "zai-coding-plan/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "zai-coding-plan/glm-5.2-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "zai-coding-plan/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "zai-coding-plan/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zai-coding-plan/glm-5.3-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "zeldoc/zdev": {
    toolCall: true,
    structuredOutput: true
  },
  "zenifra/alibaba/qwen3.6-35b-a3b": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/anthropic/claude-3.5-haiku": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-3.7-sonnet": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-fable-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-haiku-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4.1": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-opus-4.8": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-sonnet-4": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-sonnet-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-sonnet-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-sonnet-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/anthropic/claude-sonnet-5-free": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/baidu/ernie-5.0-thinking-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/deepseek/deepseek-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/deepseek/deepseek-v3.2": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/deepseek/deepseek-v3.2-exp": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/deepseek/deepseek-v4-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/deepseek/deepseek-v4-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/google/gemini-2.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-2.5-flash-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-3-flash-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-3.1-flash-lite": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/google/gemini-3.1-flash-lite-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-3.1-pro-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/google/gemini-3.5-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/inclusionai/ling-1t": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/inclusionai/ring-1t": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/inclusionai/ring-2.6-1t": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/kuaishou/kat-coder-pro-v2": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2.1": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2.5-lightning": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m2.7-highspeed": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/minimax/minimax-m3": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2-0905": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2-thinking": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2-thinking-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/moonshotai/kimi-k2.7-code": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/moonshotai/kimi-k2.7-code-free": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/moonshotai/kimi-k3": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/moonshotai/kimi-k3-free": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.1": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.1-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.1-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.1-codex-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.2": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.2-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.3-chat": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.3-codex": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.4": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.4-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.4-nano": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.4-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/openai/gpt-5.5": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5.5-instant": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5.5-pro": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5.6-luna": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5.6-sol": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/openai/gpt-5.6-terra": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/qwen/qwen3-coder-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3-max": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3.5-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3.6-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3.7-max": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/qwen/qwen3.7-plus": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/sapiens-ai/agnes-1.5-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/sapiens-ai/agnes-1.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/stepfun/step-3": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/stepfun/step-3.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/stepfun/step-3.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/stepfun/step-3.7-flash-free": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/tencent/hy3-preview": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-1.8": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-2.0-code": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-2.0-lite": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-2.0-mini": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-2.0-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/volcengine/doubao-seed-code": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4.1-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4.1-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4.2-fast": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4.2-fast-non-reasoning": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/x-ai/grok-4.3": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/x-ai/grok-4.5": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/x-ai/grok-build-0.1": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/x-ai/grok-code-fast-1": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/xiaomi/mimo-v2-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/xiaomi/mimo-v2-omni": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/xiaomi/mimo-v2-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/xiaomi/mimo-v2.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/xiaomi/mimo-v2.5-pro": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.6v-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.6v-flash-free": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.7-flash-free": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-5-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "zenmux/z-ai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/z-ai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/z-ai/glm-5.2-free": {
    toolCall: true,
    structuredOutput: true
  },
  "zenmux/z-ai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.5": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.5-air": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.5-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.5v": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.6": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.7-flash": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-4.7-flashx": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-5": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai-coding-plan/glm-4.6v": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai-coding-plan/glm-4.7": {
    toolCall: true,
    structuredOutput: null
  },
  "zhipuai-coding-plan/glm-5-turbo": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.1": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.2": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.2-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.3": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.3-flash": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5.3-highspeed": {
    toolCall: true,
    structuredOutput: true
  },
  "zhipuai-coding-plan/glm-5v-turbo": {
    toolCall: true,
    structuredOutput: null
  }
} as const satisfies Record<string, MastraModelCapability>;

const UNKNOWN_MODEL_CAPABILITY: MastraModelCapability = {
  toolCall: null,
  structuredOutput: null
};

export function modelCapabilityFor(modelId: string): MastraModelCapability {
  const map = MASTRA_MODEL_CAPABILITIES as Record<string, MastraModelCapability>;
  return map[modelId] ?? UNKNOWN_MODEL_CAPABILITY;
}

/**
 * Mastra model router id: `provider/model`. Model slugs may themselves contain
 * `/` (e.g. openrouter `anthropic/claude-...`, `~anthropic/claude-...-latest`);
 * those are provider-side slugs, not router ids, so they still need the
 * provider prefix. Already-prefixed ids (e.g. `openrouter/auto`) pass through.
 */
export function toMastraModelId(providerId: string, modelName: string): string {
  if (modelName.startsWith(`${providerId}/`)) return modelName;
  return `${providerId}/${modelName}`;
}

export function parseMastraModelId(modelId: string): { provider: string | null; model: string } {
  const idx = modelId.indexOf("/");
  if (idx <= 0) return { provider: null, model: modelId };
  return { provider: modelId.slice(0, idx), model: modelId.slice(idx + 1) };
}

// Catalog content hash: 26672a2008b73da0 — informational (includes live models.dev capabilities).
// Catalog registry hash: f19b39c4042ba479 — compared by sync script --check; do not edit.
