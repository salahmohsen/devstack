# 0003 — Voice is a peer of identity, not a facet

The agent's writing-style rules (tone, dos, don'ts) live in
`packages/core/src/voice/schema.ts` and `packages/ai/src/agents/prompt-fragments.ts`,
**not** in `portfolio_identity_facets`. Voice is consumed only by the agent's
`instructions` string; it is not displayed on the public site, not exposed to the
dashboard identity view, and not part of the audit trail of the user's
self-description.

Without this split, the `portfolio_identity_revisions` table would conflate two
qualitatively different events: "Salah rewrote his bio" and "the agent was told to
sound more casual" would both be revisions of facets, indistinguishable in the
timeline. Voice also gets edited through a separate dashboard surface with a
different validation shape (freeform `tone: string` + lists, not the structured
`{ short, long }` of bio).
