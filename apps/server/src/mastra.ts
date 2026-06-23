import { type Mastra } from "@mastra/core";
import { env } from "cloudflare:workers";

import { mountMastra, createMastra } from "@tsu-stack/ai/mastra";

import { app } from "#@/app";

const mastra: Mastra = createMastra(env);
await mountMastra(app, mastra);

export { app };
