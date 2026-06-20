# HMR and vite-plugin-checker with @cloudflare/vite-plugin

Use this when touching HMR, `vite-plugin-checker`, the Cloudflare Vite plugin, or the dev server WebSocket setup in `apps/web`.

## The Problem

`@cloudflare/vite-plugin` + TanStack Start + `vite-plugin-checker` have three compounding issues that prevent HMR and the browser typecheck overlay from working out of the box:

1. **CF plugin drops Vite HMR WebSocket upgrades** — the plugin's `handleWebSocket` function registers `socket.on("error", () => socket.destroy())` on every WS upgrade, then silently returns for `vite-hmr` subprotocol requests that don't match the Sandbox SDK origin pattern. The error listener stays attached and kills the socket before Vite's own HMR server can claim it. Tracked upstream as [workers-sdk#13891](https://github.com/cloudflare/workers-sdk/issues/13891).

2. **TanStack Start's dev client doesn't load `/@vite/client`** — the auto-generated `virtual:tanstack-start-dev-client-entry` only sets up React Refresh and hydration. It does not import Vite's HMR client, so the browser never opens the WebSocket even when the CF filter isn't blocking.

3. **`vite-plugin-checker`'s client runtime isn't injected into SSR HTML** — the checker uses `transformIndexHtml` to inject its runtime, but TanStack Start's SSR output bypasses Vite's HTML transform pipeline. The checker's overlay custom element (`vite-plugin-checker-error-overlay`) is never registered in the browser, even though the worker correctly detects TypeScript errors and pushes them over the WS.

## The Fixes

### 1. Patch `@cloudflare/vite-plugin` — move error listener after the filter

**File:** `patches/@cloudflare__vite-plugin.patch`
**Registered in:** `pnpm-workspace.yaml` → `patchedDependencies`

The patch moves `socket.on("error", () => socket.destroy())` from before the `vite-hmr` filter check to after it. This way, when the filter returns early for non-sandbox `vite-hmr` upgrades, the socket has no error listener attached — Vite's own HMR WebSocketServer can claim the upgrade cleanly via its own `httpServer.on("upgrade", ...)` listener.

The patch is applied automatically by pnpm on `pnpm install`. No manual step needed.

### 2. Inject `/@vite/client` in `__root.tsx`

**File:** `apps/web/src/routes/__root.tsx`

```tsx
{
  import.meta.env.DEV ? (
    <>
      <script type="module" src="/@vite/client" />
      <script type="module" src="/@vite-plugin-checker-runtime-entry" />
    </>
  ) : null;
}
```

Both scripts are dev-only (`import.meta.env.DEV`). Vite tree-shakes them in production builds.

- `/@vite/client` — opens the HMR WebSocket to `ws://localhost:3000/?token=…` with the `vite-hmr` subprotocol. This is what receives hot updates when files change.
- `/@vite-plugin-checker-runtime-entry` — registers the `vite-plugin-checker-error-overlay` custom element and sends a `runtime-loaded` event over the WS so the server replays cached TypeScript errors to the browser.

### 3. `devtools()` must be the first Vite plugin

**File:** `apps/web/vite.config.ts`

`@tanstack/devtools-vite` owns the server event bus (WebSocket + SSE transport) that the devtools panel and other plugins connect to. Per its [official docs](https://tanstack.com/devtools/latest/docs/integrations/vite-plugin), it must be the **first** plugin in the array. Reordering it later breaks the event bus.

## Verification

After starting the dev server (`pnpm --filter @tsu-stack/web dev`), confirm:

1. **Console** — `[vite] connecting...` then `[vite] connected.`
2. **Network → WS** — a WebSocket connection to `ws://localhost:3000/?token=…`
3. **WS frames** — `{"type":"connected"}` received, then `{"type":"custom","event":"vite-plugin-checker",...}` frames carrying TypeScript error diagnostics
4. **Browser overlay** — a badge in the bottom-left corner (per `overlay: { position: "bl" }` config) showing the error count; clicking it expands the full diagnostic overlay

To test via curl (no browser):

```bash
TOKEN=$(curl -sS http://localhost:3000/@vite/client | grep -oE 'wsToken = "[^"]+"' | sed 's/wsToken = "//;s/"//')
curl -sS -i -N --max-time 2 \
  -H "Connection: Upgrade" -H "Upgrade: websocket" \
  -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" \
  -H "Sec-WebSocket-Version: 13" \
  -H "Sec-WebSocket-Protocol: vite-hmr" \
  -H "Origin: http://localhost:3000" \
  "http://localhost:3000/?token=$TOKEN"
```

Expected: `HTTP/1.1 101 Switching Protocols` + `Sec-WebSocket-Protocol: vite-hmr` + `{"type":"connected"}`.

> **Note:** The `Origin` header and `?token=` query param are required. Without `Origin`, Vite's HMR server skips the token check (curl without Origin works). Browsers always send `Origin`, so the token is mandatory for browser connections. `/@vite/client` automatically embeds the token in the WS URL it constructs.

## When to Remove the Patch

The patch is a workaround for [workers-sdk#13891](https://github.com/cloudflare/workers-sdk/issues/13891). When Cloudflare ships the `hmrForwardOrigins` config option (or otherwise fixes the `hasSandboxOrigin` filter to not block `vite-hmr` upgrades for default localhost origins), the patch is no longer needed.

To remove:

1. Delete `patches/@cloudflare__vite-plugin.patch`
2. Remove the `patchedDependencies` entry from `pnpm-workspace.yaml`
3. Run `pnpm install`
4. The `/@vite/client` and `/@vite-plugin-checker-runtime-entry` injections in `__root.tsx` are still needed regardless of the patch — they fix a separate issue (TanStack Start not loading these scripts).

## Related Upstream Issues

- [workers-sdk#13891](https://github.com/cloudflare/workers-sdk/issues/13891) — the `hasSandboxOrigin` filter that drops `vite-hmr` upgrades. Closed but the `hmrForwardOrigins` opt-in fix is not in 1.42.x.
- [workers-sdk#13952](https://github.com/cloudflare/workers-sdk/issues/13952) — separate Cloudflare + TanStack Start bug (SSR runtime crash). Not related to HMR but same plugin combo.
- [vitejs/vite#3093](https://github.com/vitejs/vite/issues/3093) — historical Vite HMR port-derivation issue. Closed. Not related but useful context for understanding `server.hmr` config.
