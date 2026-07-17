# GitHub Signal Broadcast via Redis Pub/Sub with @socket.io/redis-adapter

Replaces the Cloudflare Durable Object `GitHubSignalRelay` with a
Socket.IO Gateway that uses `@socket.io/redis-adapter` to fan out
broadcasts across NestJS instances through Redis pub/sub.

The Durable Object's broadcast semantics — in-memory subscription of
keys, fire-and-forget broadcasts — match Redis pub/sub exactly: a
publisher calls `PUBLISH`, every subscriber receives the event,
no persistence unless the consumer explicitly stores it. The replace
is direct, no change in the `getRevalidationSignals` reconcile
mechanism that already handles missed broadcasts.

The adapter takes two `ioredis` clients (pub + sub). We reuse the
existing `CacheService` Redis connection, adding `sub.duplicate()` for
the subscriber, and pass both into `createAdapter(pub, sub)` at the
Socket.IO server constructor.

If we deploy multiple NestJS replicas in the future, Redis carries
the signals across processes without further changes. If Redis is
unavailable, signall broadcasts are degraded (clients reconcile via
the durable `github_revalidation_signal` row + a 20s polling
fallback in the browser).
