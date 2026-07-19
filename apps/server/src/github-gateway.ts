import { type Server as HTTPServer } from "node:http";

import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { Server as SocketIOServer } from "socket.io";

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

  const onRedisError = (err: Error) => {
    if (err.message.includes("ECONNREFUSED")) return;
    console.warn("[ws-redis]", err.message);
  };
  pubClient.on("error", onRedisError);
  subClient.on("error", onRedisError);

  Promise.all([pubClient.ping().catch(() => null), subClient.ping().catch(() => null)])
    .then(([pubOk, subOk]) => {
      if (pubOk && subOk) {
        io.adapter(createAdapter(pubClient, subClient));
        console.log("[ws] Redis adapter connected");
      } else {
        console.warn("[ws] Redis unavailable — running without Redis adapter");
      }
    })
    .catch(() => {
      console.warn("[ws] Redis unavailable — running without Redis adapter");
    });

  io.on("connection", (socket) => {
    console.log(`[WS] Client connected: ${socket.id}`);

    socket.on("subscribe", (payload: { keys: string[] }) => {
      if (payload?.keys && Array.isArray(payload.keys)) {
        for (const key of payload.keys) {
          void socket.join(`signal:${key}`);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`[WS] Client disconnected: ${socket.id}`);
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
