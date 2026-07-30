import { type Server as HTTPServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Server as SocketIOServer } from "socket.io";

import { createLogger } from "@tsu-stack/logger/server";

let _broadcastSignals: ((keys: string[]) => void) | null = null;

export function createGithubGateway(httpServer: HTTPServer, redisUrl: string) {
  const io = new SocketIOServer(httpServer, {
    path: "/api/ws/github-signals",
    cors: {
      origin: "*",
      credentials: true
    }
  });

  const redisOpts = {
    enableOfflineQueue: true,
    retryStrategy(times: number) {
      if (times > 10) return null;
      return Math.min(times * 200, 5000);
    }
  } as const;

  const pubClient = new Redis(redisUrl, redisOpts);
  const subClient = pubClient.duplicate(redisOpts);

  // ioredis emits "error" on every reconnect attempt — log once, not a flood.
  let redisErrorLogged = false;
  const onRedisError = (err: Error) => {
    const msg = err.message ?? String(err);
    // Transient connect noise while Redis is still coming up / bad URL once
    if (
      msg.includes("ECONNREFUSED") ||
      msg.includes("ENOENT") ||
      msg.includes("ECONNRESET") ||
      msg.includes("Connection is closed")
    ) {
      return;
    }
    if (redisErrorLogged) return;
    redisErrorLogged = true;
    const log = createLogger({ operation: "server__ws_redis_error" });
    log.set({ event: "ws_redis_error", message: msg.slice(0, 200) });
    log.emit({ _forceKeep: true });
  };
  pubClient.on("error", onRedisError);
  subClient.on("error", onRedisError);

  Promise.all([pubClient.ping().catch(() => null), subClient.ping().catch(() => null)])
    .then(([pubOk, subOk]) => {
      const log = createLogger({ operation: "server__ws_redis_adapter" });
      if (pubOk && subOk) {
        io.adapter(createAdapter(pubClient, subClient));
        log.set({ event: "ws_redis_adapter_connected" });
        log.emit();
      } else {
        log.set({
          event: "ws_redis_adapter_unavailable",
          // redacted host only — help spot bad REDIS_URL without secrets
          redisHost: (() => {
            try {
              return new URL(redisUrl).host;
            } catch {
              return "invalid_url";
            }
          })()
        });
        log.emit({ _forceKeep: true });
      }
    })
    .catch(() => {
      const log = createLogger({ operation: "server__ws_redis_adapter" });
      log.set({ event: "ws_redis_adapter_unavailable" });
      log.emit({ _forceKeep: true });
    });

  io.on("connection", (socket) => {
    // Connection volume can be high — keep at debug-equivalent by omitting routine connect/disconnect
    // from durable wide events. Subscribe failures would be a future enhancement.

    socket.on("subscribe", (payload: { keys: string[] }) => {
      if (payload?.keys && Array.isArray(payload.keys)) {
        for (const key of payload.keys) {
          void socket.join(`signal:${key}`);
        }
      }
    });
  });

  function broadcastSignals(signalKeys: string[]) {
    for (const key of signalKeys) {
      io.to(`signal:${key}`).emit("github-signals", { type: "signals", keys: signalKeys });
    }
  }

  function broadcastWebhook(event: string, payload: unknown) {
    io.emit("github-webhook", { event, payload });
  }

  _broadcastSignals = broadcastSignals;
  return { io, broadcastSignals, broadcastWebhook };
}

export function broadcastSignals(signalKeys: string[]) {
  _broadcastSignals?.(signalKeys);
}
