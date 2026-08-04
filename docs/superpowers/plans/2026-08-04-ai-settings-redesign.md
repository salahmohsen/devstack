# AI Settings Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Big-bang redesign of Settings → AI: live BYO model lists, quiet three-section IA (coss Combobox/Field/Button), Test on models with provider binding, catalog fallback only.

**Architecture:** Server `listProviderModels` fetches `/v1/models` (or adapters) with the user’s key; UI comboboxes group by provider label. Persist `modelProviderIds` per feature so generate/test use the correct multipes key. Default template is `models.reply`; override = model **or** binding differs.

**Tech Stack:** oRPC, TanStack Query, coss/`@tsu-stack/ui` Combobox + SecretInput + Button + Collapsible, Zod, existing `testAiProviderConnection` / provider-ping agent.

**Spec:** `docs/superpowers/specs/2026-08-04-ai-settings-redesign-design.md`

**UI skills:** coss, better-writing, better-layout, better-ui, better-accessibility, `.agents/ui.md`

---

## File map

| File                                                                    | Responsibility                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/core/src/ai-settings/types.ts`                                | `modelProviderIds` on get/update schemas; list models I/O      |
| `packages/core/src/ai-settings/utils.ts`                                | `isOnDefault`, `resolveProviderForFeature`, cascade helpers    |
| `packages/core/src/ai-settings/__tests__/*`                             | Unit tests for equality + resolve                              |
| `packages/core/src/ai-settings/mastra-provider-catalog.ts`              | Optional `modelsListUrl` / adapter hints; keep fallback models |
| `packages/db` schema + migration                                        | Store `modelProviderIds` jsonb (or embed in settings document) |
| `packages/api/src/lib/settings/list-provider-models.ts`                 | Fetch + parse + cache + fallback                               |
| `packages/api/src/lib/settings/test-ai-provider.ts`                     | Already model-aware; ensure binding-friendly                   |
| `packages/api/src/lib/settings/resolve-runtime-ai*` or existing resolve | Use `modelProviderIds`                                         |
| `packages/api/src/routers/ai-settings.router.ts`                        | `listProviderModels`; update get/update                        |
| `apps/web/.../ai-settings.tsx`                                          | Full UI redesign per IA                                        |
| `apps/web/.../features/ai-settings/api/*`                               | Query + mutations                                              |

---

### Task 1: Core types + default equality helpers

**Files:**

- Modify: `packages/core/src/ai-settings/types.ts`
- Modify: `packages/core/src/ai-settings/utils.ts`
- Create/modify: unit tests under `packages/core/src/ai-settings/`

- [ ] **Step 1: Add schemas**

```ts
export const AiModelProviderIdsMapSchema = z
  .object({
    classify: z.string().min(1).max(64).optional(),
    reply: z.string().min(1).max(64).optional(),
    resumeImport: z.string().min(1).max(64).optional(),
    stacks: z.string().min(1).max(64).optional(),
    hubChat: z.string().min(1).max(64).optional(),
    scorer: z.string().min(1).max(64).optional(),
    applyPackage: z.string().min(1).max(64).optional()
  })
  .partial(); // or full optional keys

// AiSettingsOutputSchema += modelProviderIds: AiModelProviderIdsMapSchema.default({})
// UpdateAiSettingsInputSchema += modelProviderIds optional
// ListProviderModelsInput/Output schemas as in design
```

- [ ] **Step 2: Helpers (TDD)**

```ts
export function isFeatureOnDefault(args: {
  feature: AiFeature;
  models: AiModelsMap;
  bindings: Partial<Record<AiFeature, string | undefined>>;
}): boolean {
  // model equal models.reply AND effective binding equal
}

export function cascadeDefaultModelChange(args: {
  prevModels: AiModelsMap;
  prevBindings: ...;
  nextDefaultModel: string;
  nextDefaultProviderId: string | undefined;
}): { models: AiModelsMap; bindings: ... }
```

- [ ] **Step 3: Tests for Work vs Personal same model different binding → not on Default**
- [ ] **Step 4: Commit** `feat(core): ai settings modelProviderIds and default equality`

---

### Task 2: DB persistence

**Files:** user AI settings schema + migration if needed

- [ ] **Step 1:** Add `modelProviderIds` to stored settings (jsonb default `{}`)
- [ ] **Step 2:** Repository read/write maps field
- [ ] **Step 3:** Migration generate/apply in worktree convention
- [ ] **Step 4:** Commit `feat(db): persist ai modelProviderIds bindings`

---

### Task 3: listProviderModels + resolve key

**Files:**

- Create: `packages/api/src/lib/settings/list-provider-models.ts`
- Modify: resolve runtime credentials used by agent callers
- Modify: `ai-settings.router.ts`

- [ ] **Step 1:** Implement OpenCode Go adapter against `https://opencode.ai/zen/go/v1/models` (map to `opencode-go/<id>`)
- [ ] **Step 2:** Generic OpenAI-compatible adapter when base URL known; else catalog fallback
- [ ] **Step 3:** In-memory cache 20m; never log key
- [ ] **Step 4:** `listProviderModels` procedure (protected)
- [ ] **Step 5:** Update `resolveRuntimeAiCredentials` / equivalent: binding → orphan fallback
- [ ] **Step 6:** On `update` with replaceProviders, strip dead binding ids
- [ ] **Step 7:** Commit `feat(api): listProviderModels and provider-bound runtime llm`

---

### Task 4: Web API hooks

**Files:** `apps/web/src/features/ai-settings/`

- [ ] **Step 1:** `useListProviderModelsQuery` (enabled when kind+key available; pass draft key carefully — may need mutation or POST with key in body so key never hits query string)
- [ ] **Step 2:** Prefer **POST** procedure for list when draft key present (avoid cache leakage of keys in URL)
- [ ] **Step 3:** Export from feature index
- [ ] **Step 4:** Commit `feat(web): ai settings list models query`

---

### Task 5: AI settings UI redesign (coss)

**Files:** `apps/web/src/pages/dashboard/settings/ui/ai-settings.tsx` (primary)

**coss / UI rules:**

- Combobox for provider kind + models (search + free type)
- SecretInput for keys only (no Test)
- Button outline Test next to Default model always
- Feature rows: if `isFeatureOnDefault` → show text **Default** (not model string); else Combobox + Test
- Exclude `reply` from customize feature list; include `applyPackage` and all other features
- Collapsible “Customize per feature”
- Group model options by provider **label** when building items
- Minimal helper text; SettingsSaveBar dirty guard unchanged
- a11y: labels, aria-label on Test, Spinner when testing

- [ ] **Step 1:** Remove Test from API key row (if still present)
- [ ] **Step 2:** Build model options from listProviderModels for each provider with key + catalog fallback + free type
- [ ] **Step 3:** Default row: combobox + Test → `testProvider({ kind, modelId, apiKey?, providerId? })`
- [ ] **Step 4:** Customize rows with Default label / override + conditional Test
- [ ] **Step 5:** Save sends `models` + `modelProviderIds`
- [ ] **Step 6:** Manual smoke: Go key → Luna appears → Test succeeds
- [ ] **Step 7:** Commit `feat(web): redesign ai settings models and test`

---

### Task 6: Copy + empty states polish

- [ ] **Step 1:** Apply design copy table (page description, empty providers, errors)
- [ ] **Step 2:** Commit `docs(web): ai settings quiet copy`

---

### Task 7: Verification

- [ ] **Step 1:** Unit tests core + api adapters
- [ ] **Step 2:** `vp check` web/api/core as applicable
- [ ] **Step 3:** Manual: multipes labels; binding after save; generate uses bound key

---

## Execution notes

- Worktree: `.worktrees/career-mail-assistant-p0`
- Prefer POST for list-with-draft-key
- Do not fetch models in the browser with raw key
- Discard incomplete half-move of Test if it conflicts — implement this design fully
- Catalog already updated for Go 25 models remains useful as **fallback**

## Done when

Spec success criteria 1–7 are met; no secrets in logs/toasts.
