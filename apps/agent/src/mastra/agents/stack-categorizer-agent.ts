import { Agent } from "@mastra/core/agent";

import { MODEL_PRESETS } from "#@/mastra/model-config";
import { npmHealthTool } from "#@/mastra/tools/npm-health-tool";

export function createStackCategorizerAgent() {
  return new Agent({
    id: "stack-categorizer",
    name: "Stack Categorizer",
    instructions: `You categorize a single npm package into a tech stack type.

You receive one package at a time with existing stack context.

Types: framework, language, database, ui, auth, deployment, testing,
ai, tooling, storage, other.

For each package, decide:
1. Does it belong to an existing stack? (yes/no)
2. If yes: which stack name?
3. If no: what type from the list above?
4. Display name (e.g., "React" not "react", "Tailwind CSS" not "tailwindcss")
5. Confidence: high/medium/low
6. A one-sentence description

Use the get-npm-health tool to check package health when confidence
is medium or low, to improve accuracy.`,
    tools: { npmHealthTool },
    model: MODEL_PRESETS.default
  });
}

export default createStackCategorizerAgent;
