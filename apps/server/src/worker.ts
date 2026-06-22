import { ENV_SERVER } from "@tsu-stack/env/server/env";

import { GitHubSignalRelay } from "#@/github-signal-relay";
import { app } from "#@/mastra";

export default {
  fetch(request: Request, env: Cloudflare.Env, executionContext: ExecutionContext) {
    const url = new URL(request.url);
    const websocketPath = `${new URL(ENV_SERVER.VITE_SERVER_URL).pathname}/api/ws/github-signals`;

    if (url.pathname === websocketPath) {
      const id = env.GITHUB_SIGNAL_RELAY.idFromName("global");
      const stub = env.GITHUB_SIGNAL_RELAY.get(id);
      return stub.fetch("https://internal/connect", request);
    }

    return app.fetch(request, env, executionContext);
  }
};

export { GitHubSignalRelay };
