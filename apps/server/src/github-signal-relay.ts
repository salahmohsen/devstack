type SubscribeMessage = {
  keys: string[];
  type: "subscribe";
};

function isSubscribeMessage(data: unknown): data is SubscribeMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    data.type === "subscribe" &&
    "keys" in data &&
    Array.isArray(data.keys) &&
    data.keys.every((value) => typeof value === "string")
  );
}

export class GitHubSignalRelay {
  private subscriptions = new Map<WebSocket, Set<string>>();

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

  private async handleBroadcast(request: Request) {
    const body = (await request.json()) as {
      signalKeys?: string[];
    };
    const signalKeys = body.signalKeys;
    if (!Array.isArray(signalKeys) || signalKeys.length === 0) {
      return new Response("Missing signalKeys", { status: 400 });
    }

    const payload = JSON.stringify({
      keys: signalKeys,
      type: "signals"
    });
    const signalSet = new Set(signalKeys);

    for (const [socket, subscribedKeys] of this.subscriptions) {
      const hasMatch = [...subscribedKeys].some((key) => signalSet.has(key));
      if (!hasMatch) {
        continue;
      }

      try {
        socket.send(payload);
      } catch {
        this.subscriptions.delete(socket);
      }
    }

    return Response.json({ ok: true });
  }

  private handleConnect(request: Request) {
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected websocket upgrade", { status: 426 });
    }

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);

    server.accept();
    this.subscriptions.set(server, new Set());

    server.addEventListener("message", (event) => {
      if (typeof event.data !== "string") {
        return;
      }

      try {
        const payload = JSON.parse(event.data) as unknown;
        if (isSubscribeMessage(payload)) {
          this.subscriptions.set(server, new Set(payload.keys));
        }
      } catch {
        // ignore malformed payloads
      }
    });

    server.addEventListener("close", () => {
      this.subscriptions.delete(server);
    });
    server.addEventListener("error", () => {
      this.subscriptions.delete(server);
    });

    return new Response(null, {
      status: 101,
      webSocket: client
    } as ResponseInit);
  }
}
