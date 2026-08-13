"use client";

import { type ComponentProps } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/** Assistant-ui surface mono token (from registry surfaces kit). */
const mono = "font-mono text-[11px] tracking-tight";

export type DatedMessage = {
  id: string;
  day: string;
  time: string;
  role: "user" | "assistant";
  text: string;
};

export function DaySeparator({
  messages,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children" | "messages"> & {
  messages: readonly DatedMessage[];
}) {
  return (
    <div
      data-slot="day-separator"
      className={cn("flex w-full max-w-sm flex-col gap-2", className)}

      {...props}
    >
      {messages.map((message, index) => {
        const previousDay = index > 0 ? messages[index - 1]?.day : undefined;
        const newDay = message.day !== previousDay;

        return (
          <div key={message.id} className="flex flex-col gap-2">
            {newDay && (
              <div className="flex items-center gap-2.5 py-1">
                <span className="h-px flex-1 bg-foreground/8" />
                <span className={cn(mono, "text-foreground/30")}>{message.day}</span>
                <span className="h-px flex-1 bg-foreground/8" />
              </div>
            )}
            <div
              className={cn(
                "group flex items-baseline gap-2",
                message.role === "user" && "flex-row-reverse"
              )}
            >
              <span
                className={cn(
                  "max-w-[80%] text-[13.5px] leading-relaxed wrap-break-word",
                  message.role === "user"
                    ? "rounded-2xl bg-foreground/5 px-3.5 py-2"
                    : "text-foreground/75"
                )}
              >
                {message.text}
              </span>
              <span
                className={cn(
                  mono,
                  "shrink-0 text-foreground/0 tabular-nums transition-colors group-hover:text-foreground/30"
                )}
              >
                {message.time}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
