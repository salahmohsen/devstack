import { type HonoApp, MastraServer } from "@mastra/hono";

import { getMastra } from "#@/mastra/index";
import { type D1Database } from "#@/memory/index";

const serverCache = new WeakMap<D1Database, Promise<MastraServer>>();

export function mountMastra(app: HonoApp) {
  return app.use("*", async (c, next) => {
    const env = c.env as { MASTRA_DB: D1Database };
    let serverPromise = serverCache.get(env.MASTRA_DB);
    if (!serverPromise) {
      serverPromise = (async () => {
        const mastra = getMastra(env);
        const server = new MastraServer({ app, mastra });
        await server.init();
        return server;
      })();
      serverCache.set(env.MASTRA_DB, serverPromise);
    }
    await serverPromise;
    await next();
  });
}
