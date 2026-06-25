import { DurableObject } from "cloudflare:workers";

type SubscribeMessage = {
  type: "subscribe";
  keys: string[];
};

type SocketState = { keys: string[] };

function isSubscribeMessage(data: unknown): data is SubscribeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "subscribe" &&
    "keys" in data &&
    Array.isArray((data as { keys: unknown }).keys) &&
    (data as { keys: unknown[] }).keys.every((k) => typeof k === "string")
  );
}

export class GitHubSignalRelay extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/broadcast" && request.method === "POST") {
      return this.handleBroadcast(request);
    }

    if (url.pathname === "/connect") {
      return this.handleConnect(request);
    }

    return new Response("Not found", { status: 404 });
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    const body = (await request.json()) as { signalKeys?: string[] };
    const signalKeys = body.signalKeys;
    if (!Array.isArray(signalKeys) || signalKeys.length === 0) {
      return new Response("Missing signalKeys", { status: 400 });
    }

    const payload = JSON.stringify({ type: "signals", keys: signalKeys });
    const signalSet = new Set(signalKeys);

    for (const ws of this.ctx.getWebSockets()) {
      const state = ws.deserializeAttachment() as SocketState | null;
      if (!state?.keys.some((key) => signalSet.has(key))) {
        continue;
      }
      try {
        ws.send(payload);
      } catch {
        ws.close();
      }
    }

    return Response.json({ ok: true });
  }

  private handleConnect(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ keys: [] } satisfies SocketState);

    return new Response(null, {
      status: 101,
      webSocket: client
    } as ResponseInit);
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    if (typeof message !== "string") return;
    try {
      const payload = JSON.parse(message) as unknown;
      if (isSubscribeMessage(payload)) {
        ws.serializeAttachment({ keys: payload.keys } satisfies SocketState);
      }
    } catch {
      // ignore malformed payloads
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    _reason: string,
    _wasClean: boolean
  ): Promise<void> {
    try {
      ws.close(code, "closing");
    } catch {
      // already closed
    }
  }

  async webSocketError(ws: WebSocket, _error: unknown): Promise<void> {
    try {
      ws.close(1011, "internal error");
    } catch {
      // already closed
    }
  }
}
