import { ClientOnly } from "@tanstack/react-router";
import { useState } from "react";

import { Button } from "@tsu-stack/ui/components/button";

import { Container } from "@/shared/ui/container";

import { useAgentChat } from "@/features/agent";

export function AgentChatPage() {
  return (
    <Container>
      <h1 className="mb-4 text-2xl">Agent Playground</h1>

      <ClientOnly>
        <AgentChat />
      </ClientOnly>
    </Container>
  );
}

function AgentChat() {
  const { messages, sendMessage, status } = useAgentChat();
  const [input, setInput] = useState("");

  return (
    <>
      <div className="mb-4 space-y-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`rounded-lg p-3 ${message.role === "user" ? "bg-muted" : "bg-card"}`}
          >
            <strong>{message.role === "user" ? "You" : "Agent"}: </strong>
            {message.parts.map((part, index) =>
              part.type === "text" ? <span key={index}>{part.text}</span> : null
            )}
          </div>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (input.trim() && status === "ready") {
            void sendMessage({ text: input });
            setInput("");
          }
        }}
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={status !== "ready"}
          placeholder="Ask the agent..."
          className="flex-1 rounded border px-3 py-2"
        />
        <Button type="submit" disabled={status !== "ready"}>
          {status === "ready" ? "Send" : "Thinking..."}
        </Button>
      </form>
    </>
  );
}
