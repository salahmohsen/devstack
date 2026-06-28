import { app } from "#@/app";
import { GitHubSignalRelay } from "#@/github-signal-relay";

export default {
  fetch(request: Request, env: Cloudflare.Env, executionContext: ExecutionContext) {
    const url = new URL(request.url);
    const serverBaseUrl = new URL(env.VITE_SERVER_URL);
    const websocketPath = `${serverBaseUrl.pathname}/api/ws/github-signals`;

    if (url.pathname === websocketPath) {
      const id = env.GITHUB_SIGNAL_RELAY.idFromName("global");
      const stub = env.GITHUB_SIGNAL_RELAY.get(id);
      return stub.fetch("https://internal/connect", request);
    }

    return app.fetch(request, env, executionContext);
  }
};

export { GitHubSignalRelay };
