import { Agent } from "@mastra/core/agent";

import { byoModelFromRequestContext } from "#@/mastra/byo-model";

export function createStackCategorizerAgent() {
  return new Agent({
    id: "stack-categorizer",
    name: "Stack Categorizer",
    description:
      "Classifies npm packages into tech-stack types (framework, language, database, ui, etc.) and matches each to an existing stack when possible. Pure categorization; no tools.",
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
- Multi-product orgs must stay SEPARATE products, even under one npm scope:
  e.g. @tanstack/react-query ≠ @tanstack/react-form ≠ @tanstack/react-start ≠
  @tanstack/react-router. Do NOT collapse them into a single "TanStack" stack.
- Mono-product scopes (e.g. @tiptap/*, @radix-ui/*) usually share one display name.
- REUSE an existing display name if this package belongs to the same
  library/family as another package already categorized. Only invent a NEW
  unique name for genuinely distinct libraries.
- Confidence: use "high" for well-known packages and clear family members;
  "medium" when the type is clear but the product is less common; "low" only
  when guessing type/name. Prefer high/medium over low when unsure between
  medium and low.
- Do NOT use any tools. Process all packages from the information provided.`,
    model: byoModelFromRequestContext
  });
}

export default createStackCategorizerAgent;
