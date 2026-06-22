import { type HonoApp, MastraServer } from "@mastra/hono";

import { mastra } from "#@/mastra/index";

export function mountMastra(app: HonoApp) {
  const server = new MastraServer({ app, mastra });
  return server.init();
}
