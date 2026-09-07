import http from "node:http";

import { ModelRouterLanguageModel } from "@mastra/core/llm";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    console.log("PATH:", req.url);
    console.log("user-agent:", req.headers["user-agent"]);
    console.log("x-opencode-session:", req.headers["x-opencode-session"]);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "x",
        object: "chat.completion",
        created: 0,
        model: "omen-alpha",
        choices: [
          { index: 0, message: { role: "assistant", content: "ok" }, finish_reason: "stop" }
        ],
        usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }
      })
    );
    server.close();
  });
});

server.listen(0, async () => {
  const port = server.address().port;
  const model = new ModelRouterLanguageModel(
    {
      id: "opencode-go/omen-alpha",
      apiKey: "test-key",
      headers: { "x-opencode-session": "abc123", "user-agent": "tsu-stack-agent/1.0" }
    },
    []
  );
  try {
    await model.doGenerate({
      prompt: [{ role: "user", content: [{ type: "text", text: "hi" }] }],
      maxOutputTokens: 10
    });
  } catch (e) {
    console.log("ERR:", e?.message?.slice(0, 300));
  }
});
