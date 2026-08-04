# AI Settings Redesign — Design

**Date:** 2026-08-04  
**Status:** Ready for plan (grill locked; spec review issues closed)  
**Goal:** Big-bang redesign of Settings → AI: live model lists via BYO keys, quiet three-section layout, Test on models (not API key), provider-row binding for multipes, catalog as fallback only.

**Related**

- Career Inbox AI platform — `2026-07-29-career-inbox-ai-platform-design.md` (BYO providers, model per feature)
- BYO plan — `docs/superpowers/plans/2026-07-30-byo-ai-settings-to-agent.md`
- Product rule: user AI is **BYO only** (`RuntimeLlmConfig`, no process.env provider keys for user work)

**Design skills applied**

| Skill / source           | Role in this design                                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| **coss**                 | Combobox, Field, SecretInput, Button, Collapsible, Frame, Toast/sonner as already in app; trigger/content composition only |
| **better-writing**       | Short labels, verb-first Test/Save, fix-oriented errors, empty states with next action                                     |
| **better-layout**        | Space over dividers; three clear sections; progressive disclosure for per-feature models                                   |
| **better-ui**            | Minimal motion; no noisy chrome; outline Test buttons; optical row alignment                                               |
| **better-accessibility** | Visible labels, `aria-label` on Test, keyboard combobox, disabled state that explains why                                  |
| **`.agents/ui.md`**      | Settings inside Frame / SettingsSection / SettingsSaveBar; stay on coss/`@tsu-stack/ui` primitives                         |

---

## Problem

1. **Static catalog** misses new models (e.g. OpenCode Go `gpt-5.6-luna`) until code ships.
2. **Test** on the API key row does not make “this model + this key” the primary action.
3. **Multiple providers of the same kind** (Work vs Personal) cannot bind a key to a feature model today (only `provider/model` is stored).
4. Current form is functional but can feel noisy (duplicate model strings, Test in the wrong place).

---

## Product decisions (grill lock)

| #   | Decision                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------- |
| 1   | Full AI settings redesign; **big-bang single ship**                                                   |
| 2   | Model list fetch uses **user BYO key** for that provider row                                          |
| 3   | Combobox / autocomplete; **clean, low-noise** UI                                                      |
| 4   | Live fetch **lazy** when Models needs it; cache ~15–30 min                                            |
| 5   | On fetch fail / unsupported: **catalog fallback + free-type** full `provider/model`                   |
| 6   | **Test** always on **Default model**; on feature models **only if ≠ default**                         |
| 7   | Feature using default shows label **“Default”** (not the full model id again)                         |
| 8   | IA: **Providers · Models · Mail reply autonomy** + sticky save bar                                    |
| 9   | Same kind multipes: group options by **user label**; Test uses that row’s key                         |
| 10  | **Persist providerId** per feature (or equivalent binding) so generate uses the correct key           |
| 11  | Static catalog remains for **provider metadata + fallback models + fetch adapters**, not primary list |

---

## Information architecture (quiet)

```text
Settings → AI
┌─────────────────────────────────────────────┐
│ Providers                                   │
│  [kind combobox] [label] [API key secret]   │
│  + Add provider                             │
├─────────────────────────────────────────────┤
│ Models                                      │
│  Default model  [combobox········] [Test]   │
│  ▸ Customize per feature                    │
│     Feature     Default | override [Test?]  │
├─────────────────────────────────────────────┤
│ Mail reply autonomy                         │
│  Assist | Full                              │
└─────────────────────────────────────────────┘
[ Discard ]                    [ Save AI settings ]
```

### Copy (better-writing)

| Element                  | Copy                                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------------- |
| Page description         | Connect providers and choose models. Keys stay on your account.                                      |
| Providers empty          | No providers yet / Add a provider with an API key to run Hub, mail, and packages. / **Add provider** |
| Models helper (one line) | Test runs a small request with this model and the matching provider key.                             |
| Feature equals default   | Select shows **Default** (not the raw model string).                                                 |
| Test (verb-first)        | **Test** / **Testing…**                                                                              |
| Errors                   | Fix-oriented: “Enter an API key for OpenCode Go before testing.” — no oops                           |

### coss / UI composition

| Need                       | Primitive                                           |
| -------------------------- | --------------------------------------------------- |
| Provider kind / model pick | **Combobox** (search + free type full id)           |
| API key                    | **SecretInput** + Field/Label                       |
| Test / Add / Save          | **Button** outline (Test), default (Save)           |
| Per-feature disclosure     | **Collapsible**                                     |
| Feedback                   | existing **sonner** toasts (success/error)          |
| Section chrome             | **Frame**, **SettingsSection**, **SettingsSaveBar** |

No new design system. No decorative cards inside cards. Prefer `space-y-8` between sections, `space-y-3` within groups (**better-layout**).

---

## Data model

### Existing

- `providers[]`: `{ id, kind, label, apiKeyCiphertext, … }`
- `models`: map feature → `provider/model` string

### New: provider binding

Persist which provider **row** supplies the key when generating for a feature.

**Option chosen:** map alongside models:

```ts
// stored on user AI settings (jsonb)
modelProviderIds: {
  classify?: string      // provider row uuid
  reply?: string
  resumeImport?: string
  stacks?: string
  hubChat?: string
  scorer?: string
  applyPackage?: string
}
```

**Semantics**

- When user picks a model under group **Work**, set that feature’s `modelProviderIds[feature] = workProviderId`.
- When feature uses **Default**, inherit default model **and** default’s provider binding (or clear feature override).
- Resolve runtime key:
  1. `modelProviderIds[feature]` → that row’s key
  2. else first provider row whose `kind` matches `providerKindFromModelId(modelId)`
  3. else fail soft/hard per existing BYO rules

**Default model template (locked):** use **`models.reply` as the Default combobox value** (matches current UI). No separate `defaultModel` field.

- **Default combobox change:** set every feature whose model id (and provider binding, if any) still matches the **previous** `models.reply` (and previous default binding) to the new model + new default binding. Features already customized (model ≠ previous reply template) are left alone.
- **Uniform case:** all features equal `models.reply` → Default change updates all features.
- **Customize:** changing a feature to a model other than current `models.reply` is an override (Test shown). Setting a feature back to equal `models.reply` shows **Default** and sets that feature’s `modelProviderIds[feature]` to the default binding (same as reply’s).
- **Invariant:** every generate path receives `modelId` + resolved `apiKey` from the bound provider row.

### Migration

- Existing users: `modelProviderIds` empty → resolver falls back to first matching kind (current behavior).
- No forced re-entry of keys.

---

## Live model list

### API

```ts
// aiSettings.listProviderModels
input: {
  providerId?: string   // preferred: use that row’s key
  kind: AiProviderKind
  apiKey?: string       // draft key from form (optional)
}
output: {
  models: Array<{ id: string; label: string }>  // id = full Mastra "kind/model" only
  source: "live" | "fallback" | "empty"
  providerId: string | null
  errorMessage?: string  // short, no secrets
}
```

**Auth:** Prefer draft `apiKey`, else decrypt saved key for `providerId`. No server env provider keys for this list.

### Adapters

| Kind pattern                                                                 | Strategy                                            |
| ---------------------------------------------------------------------------- | --------------------------------------------------- |
| OpenAI-compatible (incl. **opencode-go**, **opencode**, openai, deepseek, …) | `GET {base}/v1/models` or known Go/Zen URL          |
| Anthropic-shaped                                                             | Adapter or catalog fallback                         |
| Unknown / fail                                                               | Catalog `entry.models` → `toMastraModelId(kind, m)` |

**OpenCode Go** (verified):  
`https://opencode.ai/zen/go/v1/models` → ids e.g. `gpt-5.6-luna`, `qwen3.8-max` → UI values `opencode-go/<id>`.

### Cache

- **In-process API memory** for v1 (no Redis required).
- Key: `userId + kind + providerId + keyFingerprint` (hash of last4 or draft fingerprint, not raw key).
- TTL: **20 minutes**.
- Invalidate on successful save of that provider’s key.

### Combobox options UX

```text
Work · OpenCode Go
  opencode-go/glm-5.2
  opencode-go/gpt-5.6-luna
Personal · OpenCode Go
  opencode-go/glm-5.2
  …
(Type a full provider/model id)
```

Grouping by **provider label** (user-given). Free-type always allowed (**coss Combobox** empty state: “Type a full provider/model id.”).

When only one provider row exists for a kind, omit redundant group chrome if it reduces noise (optional polish).

---

## Test model

### Behavior

1. User clicks **Test** next to a model combobox.
2. Resolve `modelId` from that field.
3. Resolve provider row: from **binding for that field**, else kind match.
4. Call existing `aiSettings.testProvider` with `{ kind, modelId, apiKey? | providerId? }`.
5. Toast success/error (copy already roughly correct; keep fix-oriented).

### Placement

| Control                   | Test visible?                |
| ------------------------- | ---------------------------- |
| Default model             | Always                       |
| Feature model === default | No Test; display **Default** |
| Feature model ≠ default   | Test yes                     |

### Disable rules (explain via title/aria, not noise)

- No `provider/model` shape
- No provider for kind
- No draft key and no saved key

---

## Generate / resolveRuntimeAiCredentials

Update server resolve path used by mail, stacks, apply package, hub:

```text
modelId = settings.models[feature]
providerId = settings.modelProviderIds?.[feature]
row = providerId ? findProvider(providerId) : null
apiKey =
  row with matching kind for modelId ? open(row)
  : firstMatchingKind(modelId)   // orphan / deleted binding falls through
```

**Orphan binding rule:** if `modelProviderIds[feature]` points at a missing row, or a row whose `kind` does not match `providerKindFromModelId(modelId)`, ignore the binding and use first matching kind. On `update` with `replaceProviders`, drop bindings whose provider ids are no longer in the saved list (and clear on full provider replace when ids change).

Fail closed with existing missing-BYO notes when no key.

**Do not log apiKey.**

---

## Static catalog role after redesign

`mastra-provider-catalog.ts`:

- Keep: `id`, `name`, `apiKeyEnvVars`, optional `models` **fallback**, optional fetch metadata.
- Stop treating full lists as the only UX source.
- Comment: refresh fallbacks from provider docs / `/v1/models` when convenient; not blocking.

---

## Non-goals

- Server-owned API keys for user inference
- Auto-select “best” model by benchmark
- Streaming token usage charts in settings
- Renaming Mastra provider kinds
- Dynamic models fetched from the **browser** (CORS + key leak risk) — **server only**

---

## Implementation surface (for plan)

| Area  | Touch                                                                          |
| ----- | ------------------------------------------------------------------------------ |
| core  | `modelProviderIds` schema; `listProviderModels` types; resolve helpers         |
| db    | jsonb field or embed in settings document; migration if column-shaped          |
| api   | `listProviderModels` procedure; extend update/get; resolveRuntimeAiCredentials |
| web   | `ai-settings.tsx` redesign; query for live models; Test on model rows          |
| agent | unchanged ping agent (already used by test)                                    |

---

## Success criteria

1. OpenCode Go (and other adapter-backed kinds) show **live** models after key is present — including **gpt-5.6-luna**.
2. Fetch fail still allows catalog + free-type.
3. Test on default model probes **that** model with the bound provider key.
4. Feature override shows Test only when ≠ default; else **Default**.
5. Two providers same kind: grouping by label; binding persists; generate uses correct key.
6. Layout stays quiet: three sections, minimal helper text, coss primitives only.
7. No secrets in logs or toasts.

---

## Testing

| Layer       | Cases                                                                              |
| ----------- | ---------------------------------------------------------------------------------- |
| Unit        | Adapter parse for OpenCode Go models JSON; resolve key with/without binding        |
| Unit        | “Default” equality: feature model vs default model                                 |
| Integration | listProviderModels with draft key vs saved key                                     |
| Manual      | Add Go key → see Luna → Test → success toast; override stacks model → Test appears |

---

## Risks

| Risk                                                            | Mitigation                                                     |
| --------------------------------------------------------------- | -------------------------------------------------------------- |
| Provider has no models API                                      | Fallback catalog + free-type                                   |
| Mastra routing differs from raw `/v1/models` endpoint for probe | Keep Test on **Mastra generate** path (current testAiProvider) |
| Big-bang UI regression                                          | Spec + plan; keep save/discard dirty guard                     |
| Binding forgotten on update                                     | Server defaults binding when only one provider for kind        |

---

## Open follow-ups (not this ship)

- Dynamic list for every exotic provider adapter
- “Refresh models” explicit control (lazy open is enough for v1)
- Provider health badges in the island nav
