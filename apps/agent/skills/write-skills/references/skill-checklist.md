# New skill checklist

- [ ] Folder `apps/agent/skills/<slug>/` with `SKILL.md`
- [ ] Frontmatter: `name`, `description` (trigger-focused)
- [ ] Body: goal, procedure, edge cases, output expectations
- [ ] Optional `references/` for taxonomies / examples
- [ ] Agent `skills: [path]` includes this skill
- [ ] Agent instructions tell the model **when** to activate it
- [ ] Workflow structuredOutput schema matches skill output claims
- [ ] No production secrets; examples redacted
- [ ] No deterministic pre-filter that replaces this skill’s job
