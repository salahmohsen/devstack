# model-capability-badges — data manifest

| Element                                                       | Field path                                                                                           | Class                       | Count |
| ------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | --------------------------- | ----- |
| `deepseek-v4-flash` row (tools+SO)                            | `MASTRA_MODEL_CAPABILITIES["deepseek/deepseek-v4-flash"]` → `{toolCall:true, structuredOutput:true}` | ✅ Real                     | 1     |
| `MiniMax-M2.7` row (tools ✓, SO ?)                            | `["minimax/MiniMax-M2.7"]` → `{toolCall:true, structuredOutput:null}`                                | ✅ Real                     | 1     |
| `deepseek-v3` (qiniu-ai) row (✗/✗)                            | `["qiniu-ai/deepseek-v3"]` → `{toolCall:false, structuredOutput:false}`                              | ✅ Real                     | 1     |
| `claude-opus-4-8` row (tools ✓, SO ?)                         | `["agentrouter/claude-opus-4-8"]` → `{toolCall:true, structuredOutput:null}`                         | ✅ Real                     | 1     |
| Free-typed `my-gateway/custom-model` row                      | free-type path in Settings → Models combobox (no catalog entry)                                      | ✅ Real path (synthetic id) | 1     |
| Feature tile warning ("may not work for Apply package")       | `AI_FEATURE_REQUIREMENTS.applyPackage === "structuredOutput"` + capability mismatch                  | ✅ Real logic               | 1     |
| Provider group labels (DeepSeek, MiniMax, Qiniu, AgentRouter) | real Mastra provider names                                                                           | ✅ Real                     | 4     |

Coverage note: 6854/7096 Mastra models have models.dev capability data; 242 are unknown (`?`) — the `MiniMax-M2.7` and `claude-opus-4-8` rows are real unknowns, not invented.
