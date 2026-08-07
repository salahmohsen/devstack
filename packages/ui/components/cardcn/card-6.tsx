"use client";

import type * as React from "react";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Card 6 pattern from @cardcn/card-6 — square card with corner plus marks.
 * Uses the local coss/Base UI {@link Card} (not Radix shadcn card).
 */
function CornerPlus({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      width={24}
      height={24}
      strokeWidth="1"
      stroke="currentColor"
      className={cn("absolute z-20 size-6 text-foreground", className)}
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
    </svg>
  );
}

function CornerPluses() {
  return (
    <>
      <CornerPlus className="-top-3 -left-3" />
      <CornerPlus className="-top-3 -right-3" />
      <CornerPlus className="-bottom-3 -left-3" />
      <CornerPlus className="-right-3 -bottom-3" />
    </>
  );
}

export type Card6Props = {
  className?: string;
  title?: React.ReactNode;
  titleClassName?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  /** Decorative layer under content (e.g. hover gradient). Pointer-events none recommended. */
  overlay?: React.ReactNode;
};

export function Card6({
  className,
  title,
  titleClassName,
  description,
  action,
  children,
  footer,
  overlay
}: Card6Props) {
  return (
    <Card
      className={cn(
        "relative gap-0 overflow-hidden rounded-none shadow-none before:rounded-none",
        className
      )}
    >
      {overlay}
      <CornerPluses />
      {(title != null || description != null || action != null) && (
        <CardHeader className="relative z-10 gap-2 p-5 pb-3">
          {title != null ? (
            <CardTitle className={cn("text-base leading-snug font-semibold", titleClassName)}>
              {title}
            </CardTitle>
          ) : null}
          {description != null ? (
            <CardDescription className="text-xs tracking-wide uppercase">
              {description}
            </CardDescription>
          ) : null}
          {action != null ? <CardAction>{action}</CardAction> : null}
        </CardHeader>
      )}
      {children != null ? (
        <CardContent className="relative z-10 flex flex-col gap-0 p-5 pt-1">{children}</CardContent>
      ) : null}
      {footer != null ? (
        <div className="relative z-10 min-w-0 overflow-hidden border-t border-border/50 bg-transparent p-5 pt-3">
          {footer}
        </div>
      ) : null}
    </Card>
  );
}
