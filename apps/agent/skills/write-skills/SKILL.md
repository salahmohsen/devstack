---
name: write-skills
description: >
  Use when creating, editing, or reviewing Mastra Agent Skills (SKILL.md packages).
  Teaches the Agent Skills format, progressive disclosure, and how to author
  classification/domain skills for this product.
version: 1.0.0
tags:
  - mastra
  - skills
  - authoring
---

# Writing Mastra skills

Skills are reusable instruction packages that agents load on demand. They follow the
[Agent Skills specification](https://agentskills.io) and Mastra’s
[workspace skills](https://mastra.ai/docs/workspace/skills) / [agent skills](https://mastra.ai/docs/agents/skills) docs.

## When to use this skill

- Adding a new domain skill (classification, harvest, scoring, reply tone, …)
- Editing an existing `SKILL.md`
- Reviewing whether a skill should be filesystem-based vs `createSkill()` inline

## Skill package layout

```text
skills/
  my-skill/
    SKILL.md              # required — frontmatter + instructions
    references/           # optional — deeper docs the agent can skill_read
      taxonomy.md
    scripts/              # optional — helper scripts (rare for pure LLM tasks)
    assets/               # optional — images / fixtures
```

## SKILL.md frontmatter (required)

```yaml
---
name: my-skill-slug # lowercase, hyphens; unique among skills on the agent
description: > # shown to the agent so it knows WHEN to activate
  Use when <trigger conditions>. Be specific so skill discovery picks this skill.
version: 1.0.0 # optional semver
tags: # optional
  - domain
---
```

Rules:

1. **`name`** must be a slug: `[a-z0-9-]+`.
2. **`description`** is discovery text. Write it as “Use when …”, not as the full procedure.
3. **`instructions`** (body) is what runs after activation. Be imperative and complete.

## Progressive disclosure

1. **Catalog** — agent sees name + description only (cheap).
2. **Activate** — agent loads full SKILL.md body via the `skill` tool.
3. **Deep dive** — agent uses `skill_read` for `references/*` only when needed.

Do **not** dump every edge case into the frontmatter description. Put procedures in the body; put long taxonomies/examples in `references/`.

## How to author a classification skill

For mail/label/domain classification skills:

1. Define the **closed label set** and what each means (reference file OK).
2. Define **priority** when multiple labels could apply (exactly one primary system label).
3. Give **positive and negative examples** (redacted).
4. State **out of scope** (what must stay unlabeled or use another skill).
5. Never encode production logic as brittle keyword lists that replace judgment — examples teach patterns; the model decides.
6. Require **structured output** (the workflow/agent schema is source of truth for fields).

See `references/skill-checklist.md` for a copy-paste checklist when shipping a new skill.

## Attaching skills to agents (this repo)

Filesystem skills live under `apps/agent/skills/<name>/`.

```ts
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Agent } from "@mastra/core/agent";

const skillsRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../skills");

new Agent({
  id: "example",
  model: "...",
  skills: [resolve(skillsRoot, "write-skills"), resolve(skillsRoot, "mail-classification")],
  instructions: "Activate the relevant skill before deciding."
});
```

Or use a shared `Workspace` with `skills: ['skills']` when many agents share the same skill tree.

## Anti-patterns

- Regex / keyword engines that short-circuit the model before it runs
- Skills that only restate the system prompt without domain judgment criteria
- Putting secrets, API keys, or PII fixtures in skills
- Giant single skill that mixes classify + harvest + CRM — split by concern
