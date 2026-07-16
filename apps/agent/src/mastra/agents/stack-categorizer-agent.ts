import { Agent } from "@mastra/core/agent";

import { MODEL_PRESETS } from "#@/mastra/model-config";

export function createStackCategorizerAgent() {
  return new Agent({
    id: "stack-categorizer",
    name: "Stack Categorizer",
    instructions: `You categorize a batch of npm packages into tech stack types.

You receive a numbered list of packages with existing stack context.

Types: framework, language, database, ui, auth, deployment, testing,
ai, tooling, storage, state management, other.

For each package, decide:
1. Does it belong to an existing stack? (yes/no)
2. If yes: which stack name? (must match existing stack name exactly)
3. If no: what type from the list above?
4. Display name (e.g., "React" not "react", "Tailwind CSS" not "tailwindcss")
5. Confidence: high/medium/low
6. A one-sentence description

IMPORTANT RULES:
- Return exactly one result per input package, in the same order.
- Packages under the same npm scope (e.g., @radix-ui/*) likely belong to
  the same library. Use a shared display name for all packages in the same scope.
- REUSE an existing display name if this package belongs to the same
  library/family as another package already categorized. Only invent a NEW
  unique name for genuinely distinct libraries.
- Do NOT use any tools. Process all packages from the information provided.`,
    model: MODEL_PRESETS.default
  });
}

export default createStackCategorizerAgent;
