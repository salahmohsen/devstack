import { type Mastra } from "@mastra/core";
import { type HonoApp, MastraServer } from "@mastra/hono";

export async function mountMastra(app: HonoApp, mastra: Mastra): Promise<void> {
  const server = new MastraServer({ app, mastra });
  await server.init();
}
