# 0012 — Signal relay uses the Durable Object WebSocket Hibernation API

The `GitHubSignalRelay` Durable Object used a plain class with an
in-memory `Map<WebSocket, Set<string>>` for per-socket subscription
state (`apps/server/src/github-signal-relay.ts:19`). WebSockets were
attached to the map by their `addEventListener("message", ...)` and
removed on `close` / `error`. Because the state was in memory only, a
Durable Object isolate restart dropped every connected client; clients
had to reconnect via the 20s polling fallback in
`apps/web/src/shared/lib/use-github-signal-stream.ts:455-498`.

The class now extends `DurableObject<Env>` from `cloudflare:workers` and
uses the WebSocket Hibernation API: `this.ctx.acceptWebSocket(server)`
on connect, per-socket subscription state via
`server.serializeAttachment({ keys: [...] })`, and the runtime-supplied
`webSocketMessage` / `webSocketClose` / `webSocketError` handlers in
place of the in-memory map. Per-socket state is restored from the
attachment after a hibernation wake, so subscriptions survive isolate
restarts. The runtime iterates the live sockets with
`this.ctx.getWebSockets()` and the broadcast loop filters by
`ws.deserializeAttachment().keys` against the broadcast set.

The `web_socket_auto_reply_to_close` compat flag is auto-enabled on
`compatibility_date: 2026-06-01` (≥ 2026-04-07), so the runtime
auto-responds to `Close` frames. The `webSocketClose` handler still
calls `ws.close()` as a defensive no-op; the explicit close is required
on older compat dates.

## Cost and behaviour

Idle clients no longer keep the isolate alive — the relay hibernates
when no broadcast is in flight. The `apps/server/wrangler.jsonc:61-66`
`new_sqlite_classes` migration is no longer needed (the class uses the
default KV storage for attachments) and can be removed in a follow-up
deploy.

## Considered options

- **Keep the in-memory `Map`, but persist the map to `ctx.storage` on
  every mutation.** Rejected: doubles the code path (in-memory + storage
  sync), the `Map` itself isn't meaningful after a restart because the
  WebSocket references are dead, and per-socket state would still need
  a separate persistence mechanism. The Hibernation API is the
  purpose-built primitive for this.
- **Move the relay to a separate Worker with a long-lived
  WebSocketGroup.** Rejected: the relay is small, the contract surface
  is just `connect` + `broadcast`, and a separate Worker adds deploy
  surface and per-request cost without a meaningful benefit.
