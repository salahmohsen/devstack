import { Sparkles, User } from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback } from "@tsu-stack/ui/components/avatar";
import {
  Message,
  MessageAvatar,
  MessageContent,
  MessageHeader
} from "@tsu-stack/ui/components/message";

type AgentHubMessageRowProps = {
  role: "user" | "assistant" | "system";
  children: React.ReactNode;
};

export function AgentHubMessageRow({ role, children }: AgentHubMessageRowProps) {
  const isUser = role === "user";
  const align = isUser ? "end" : "start";

  return (
    <Message align={align} className="items-start px-1">
      <MessageAvatar>
        <Avatar className="size-8">
          <AvatarFallback className="bg-muted text-muted-foreground">
            {isUser ? (
              <User className="size-4" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
          </AvatarFallback>
        </Avatar>
      </MessageAvatar>
      <MessageContent className={isUser ? "items-end" : "items-start"}>
        <MessageHeader className="sr-only">{isUser ? "You" : "Hub Supervisor"}</MessageHeader>
        {children}
      </MessageContent>
    </Message>
  );
}
