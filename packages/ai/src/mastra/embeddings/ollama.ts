import { createOllama } from "ollama-ai-provider-v2";

import { ENV_SERVER } from "@tsu-stack/env/server/env";

const ollama = createOllama({
  baseURL: ENV_SERVER.OLLAMA_BASE_URL
});

export const ollamaEmbedder = ollama.embedding(ENV_SERVER.EMBEDDING_MODEL);
