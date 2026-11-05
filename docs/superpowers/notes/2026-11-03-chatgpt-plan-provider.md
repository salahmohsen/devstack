# ChatGPT plan as a BYO AI provider

Branch `feat/chatgpt-plan-provider`. Single-user, self-hosted use only: this connects the instance owner's own ChatGPT Plus or Pro plan through OpenAI's official "Sign in with ChatGPT / ChatGPT plan usage" track for open-source apps. It must not be used with other people's plans. It does not read `~/.codex/auth.json`, does not borrow the Codex client id, and never calls `chatgpt.com/backend-api`.

Spec read: `developers.openai.com/siwc/token-sharing-open-source` and its sign-in, models-and-inference, errors-and-recovery, profiles-and-sessions, preview-limitations, token-reference and self-hosted-vms pages, plus the quickstart. The pages were fetched through a summarising tool, so field-level details below are as reported by that tool, not byte-verbatim.

## Design decision: remote server, loopback redirect

The spec requires an HTTP loopback redirect on `127.0.0.1` (never `localhost`; only the port may vary). The app server runs remotely, so it cannot receive the callback.

Chosen: server-side PKCE with a pasted redirect address. No local helper is needed.

1. `chatgptPlan.start` creates verifier, state and nonce, stores them sealed with a 10 minute expiry, and returns the authorize URL.
2. The owner opens the URL on their own machine and signs in. The browser is redirected to `http://127.0.0.1:41455/auth/callback?code=...&state=...&client_id=oaiapp_...`, where nothing listens.
3. The owner pastes the full address into Settings. `chatgptPlan.complete` validates `state`, takes the issued `client_id` from the pasted query (this is how dynamic registration returns it, so no listener is required), exchanges the code with the stored verifier, verifies the ID token, and stores the tokens sealed.

Evidence this works: the callback carries `code`, `state`, `scope` and the issued `client_id` as plain query parameters, and the code exchange needs only `client_id`, `code`, `code_verifier`, `redirect_uri` and `resource`. Nothing requires a live listener. The self-hosted-vms page itself says a `127.0.0.1` callback reaches the browser's computer, not the VM, and its own answer is "sign in locally then copy credentials"; pasting the redirect is the same idea without copying credential files. Not verified against a live OpenAI account (see checklist): OpenAI may reject a port with no listener only at the browser, which is fine, or may require the registered redirect port to match a later value. The code exchange sends the identical `redirect_uri` as the authorize request, as the spec requires.

Fixed port 41455 was chosen to avoid 1455, which Codex CLI listens on, so a running Codex login cannot swallow the callback.

## Corrections to the brief

- Scopes: the spec lists identity scopes `openid profile email` and plan scopes `offline_access resource.invoke chatgpt.tokens.use.direct`. Combined, as the brief said.
- The code exchange also sends `resource=https://api.openai.com/v1` and the refresh also sends `resource` and no `scope`.
- The ID token must be verified (JWKS signature, issuer, audience equal to the issued client id, expiry, nonce). Done with `jose` against the `jwks_uri` from discovery.
- Revocation endpoint comes from discovery `revocation_endpoint`; revoke the refresh token with `token_type_hint=refresh_token` and `client_id`; success is HTTP 200.
- Usage-limit error: the brief said HTTP 429. The spec says it can also arrive as `response.failed` after streaming starts, with codes `subscription_sharing_usage_limit_exceeded` or `subscription_sharing_usage_unavailable` (the latter is a 503-class retry-later, not a limit). Both paths are handled.
- Responses constraints beyond `store:false`/`stream:true`: `system` message items are rejected (use developer/instructions), and `temperature`, `max_output_tokens`, `top_p`, `metadata`, `user`, `previous_response_id`, `truncation` and others must be omitted. The agent fetch wrapper strips them and renames `system` to `developer`. Unsupported: image generation, file search, code interpreter, hosted MCP/connectors, `tool_search`. Function tools work.
- The endpoint is stream-only, but most agent paths call non-streaming `generateText`. The wrapper forces `stream:true` and collapses the stream back into a single response for non-streaming callers.
- `earliest_refresh_at` is a token response field; it is honored as a lower bound on refresh. Its format is not documented in the pages read (handled as epoch seconds, epoch ms or ISO).
- Preview limitations and token reference give no limit numbers. Access token 1 hour, refresh token 30 days, rotating.
- Hosted/paid apps need a separate OpenAI interest form. This integration is for a locally owned, open-source app only.

## Data and secret handling

Before: provider API keys are AES-256-GCM sealed (`packages/api/src/lib/settings/seal-secret.ts`, scrypt key from `BETTER_AUTH_SECRET`, `v1:` prefix) in `user_ai_settings.providers[].apiKeyCiphertext`. Not plaintext. The agent opens them with its own copy of the algorithm.

Now: the same sealing, unchanged, is used for ChatGPT tokens. Table `user_chatgpt_plan` (migration `20261103044456_open_thor`) holds one sealed JSON blob `credentials_ciphertext` (access, refresh and ID token, client id, scopes, expiry). Plain columns hold only non-secret metadata: host id (`urn:uuid`), issued client id, email, subject, plan label if the ID token carries one, scopes, expiry, error state. The PKCE verifier is stored sealed and is single use (`takePending` clears it). Tokens are never returned by the API, never put in URLs, and the existing logger already redacts `llmApiKey`. The access token reaches the agent over the same `llm.apiKey` channel as other keys. The Mastra request-context key cap for `apiKey` was raised from 512 to 4096 characters in `RuntimeLlmConfigSchema` because JWT access tokens are longer.

Refresh serialization: refresh runs under a Postgres advisory transaction lock per user (`pg_advisory_xact_lock`), held across the token request, with the row re-read inside the lock. That covers the API and agent processes, which both refresh. A refresh that fails with a terminal error (`invalid_grant`, `refresh_token_reused` and the rest of the spec list) clears the tokens and sets `needs_reconnect`. Transient failures keep credentials and return the still-valid token if there is one.

## Errors the UI shows

Typed codes live in core: `CHATGPT_PLAN_LIMIT`, `_RECONNECT`, `_NOT_ELIGIBLE`, `_UNAVAILABLE`, `_UNSUPPORTED`. Error text carries a `[CODE]` marker, and `parse-ai-error.ts` maps it (and the raw `subscription_sharing_usage_limit_exceeded` code) to "ChatGPT plan limit reached" and "Reconnect ChatGPT" banners with a link to AI settings. On a limit error the plan requests pause for 5 minutes (a safety pause, not an inferred reset time) and never fall back to another provider.

## Where the integration lives

- `packages/core/src/chatgpt-plan`: constants, PKCE, authorize URL, callback parsing, error mapping, code exchange, refresh, token manager with an injected `fetch` and store (kept here so the agent, which cannot import `@tsu-stack/api`, shares it). This is network code in core, a deliberate exception to `.agents/core.md`.
- `packages/db`: `user_chatgpt_plan` schema and repository.
- `packages/api`: `lib/settings/chatgpt-plan.ts`, `routers/chatgpt-plan.router.ts` (not exposed over MCP), `resolveRuntimeAiCredentials` plan branch, plan handling in list-models and test-provider.
- `apps/agent`: `lib/chatgpt-plan-model.ts` (AI SDK OpenAI Responses model with the conforming fetch), `runtime-llm.ts` model resolution, agent-side resolver and token store. Dependency added: `@ai-sdk/openai@3.0.88` (the version Mastra already aliases).
- `apps/web`: `features/ai-settings/ui/chatgpt-plan-card.tsx`, shown below Providers.

Model ids are `chatgpt-plan/<slug>`. A provider row of kind `chatgpt-plan` is created on connect and removed on disconnect, so existing per-feature model binding and the model combobox work unchanged. Disconnect resets any feature using a plan model to its default.

## Limits

- One shared five-hour limit across ChatGPT and every app on the plan.
- Models come from `GET /v1/models` (`visibility == "list"`); per account.
- No audio/video input, file search, hosted MCP, image generation.
- Access token is fixed for the lifetime of one agent model instance; a run longer than about 55 minutes would hit an expired token.
- Single account per instance; connecting a different account requires disconnecting first.

## Tests

Pure-logic unit tests: PKCE (RFC 7636 vector), authorize URL, callback parsing and state validation, error mapping, code exchange and refresh against a local fake token endpoint, refresh serialization, reconnect handling (`packages/core/src/chatgpt-plan/__tests__`), the agent fetch wrapper including a full AI SDK model call against a stubbed stream-only endpoint (`apps/agent/src/mastra/lib/chatgpt-plan-model.test.ts`), and error presentation (`apps/web/src/shared/lib/parse-ai-error.test.ts`).

## Manual verification checklist (owner, real login)

1. Settings, AI, ChatGPT plan: click Connect ChatGPT, then Open ChatGPT sign-in.
2. Sign in, approve plan usage. The browser shows a failed page at `127.0.0.1:41455`. Copy the whole address.
3. Paste it and click Finish connecting. Expect Connected, your email, and the ChatGPT plan provider appearing in the model picker.
4. Open a model dropdown: confirm ChatGPT models are listed. Pick one for Hub chat, save.
5. Click Test on the model. Expect a pass. Then send a Hub chat message and a mail classify.
6. Check the server did not log tokens: search logs for `Bearer` and the first characters of your token.
7. Wait past one hour (or set `access_expires_at` in the past in the DB) and send again: it should refresh once without a reconnect.
8. If you hit the plan limit: confirm the "ChatGPT plan limit reached" banner appears and nothing falls back to another provider.
9. Paste a stale or altered address: expect a plain error, not a crash.
10. Disconnect: confirm the row disappears from models, features reset to defaults, and the app no longer appears in ChatGPT Settings (the toast warns if OpenAI did not confirm the revoke).

## Unverified

No real ChatGPT login was possible. Not proven live: dynamic registration returning `client_id` to the pasted address, ID token claims and verification, the exact refresh response including `earliest_refresh_at`, the live `/v1/models` shape (`slug`, `display_name`, `visibility`, as documented), and the real error body for the usage limit. The authorize URL was printed and each parameter checked against the spec table.

## Open risks

- OpenAI may change preview behavior; the track is a preview.
- A same-machine process on port 41455 would intercept the redirect; the owner can still copy the address.
- The pause window after a limit error is a guess, chosen to avoid hammering.
- Mid-stream `response.failed` for streaming callers is surfaced by the AI SDK error text and matched by its raw code, not by a typed throw.
