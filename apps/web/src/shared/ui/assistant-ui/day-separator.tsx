"use client";

import { type ComponentProps } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/** Assistant-ui surface mono token (from registry surfaces kit). */
export const daySeparatorMono = "font-mono text-[11px] tracking-tight";

export type DatedMessage = {
  id: string;
  day: string;
  time: string;
  role: "user" | "assistant";
  text: string;
};

/** Rule + day label chrome. Use this in rich lists — not DaySeparator as the renderer. */
export function DaySeparatorRule({
  label,
  className,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  label: string;
}) {
  return (
    <div
      data-slot="day-separator-rule"
      aria-label={label}
      className={cn("flex w-full items-center gap-2.5 py-0.5", className)}
      {...props}
    >
      <span className="h-px flex-1 bg-foreground/8" />
      <span className={cn(daySeparatorMono, "text-foreground/30")}>{label}</span>
      <span className="h-px flex-1 bg-foreground/8" />
    </div>
  );
}

/** Hover-revealed HH:mm next to a message. Parent must be `group`. */
export function DaySeparatorTime({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      data-slot="day-separator-time"
      className={cn(
        daySeparatorMono,
        "shrink-0 text-foreground/0 tabular-nums transition-colors group-hover:text-foreground/30",
        className
      )}
      {...props}
    />
  );
}

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
            {newDay ? <DaySeparatorRule label={message.day} /> : null}
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
              <DaySeparatorTime>{message.time}</DaySeparatorTime>
            </div>
          </div>
        );
      })}
    </div>
  );
}
