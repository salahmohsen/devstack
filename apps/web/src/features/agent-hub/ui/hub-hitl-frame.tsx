"use client";

import { ShieldAlert } from "lucide-react";
import * as React from "react";

import { Alert, AlertAction, AlertDescription, AlertTitle } from "@tsu-stack/ui/components/alert";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardPanel,
  CardTitle
} from "@tsu-stack/ui/components/card";
import { cn } from "@tsu-stack/ui/lib/utils";

export type HubHitlFrameKind = "approval" | "recommendation" | "elicitation" | "confirm";

/**
 * Shared pending-card chrome for hub HITL.
 * Approval/confirm = inline Alert (not AlertDialog). Recommendation/elicitation = Card.
 */
export function HubHitlFrame({
  kind,
  title,
  description,
  icon,
  footer,
  submitting = false,
  toolCallId,
  className,
  children
}: {
  kind: HubHitlFrameKind;
  title: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  footer?: React.ReactNode;
  submitting?: boolean;
  toolCallId?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  const headingId = React.useId();
  const width = "w-full max-w-[min(72ch,100%)]";
  const interrupt = kind === "approval" || kind === "confirm";

  if (interrupt) {
    return (
      <Alert
        variant="warning"
        role="alertdialog"
        aria-labelledby={headingId}
        data-tool-call-id={toolCallId}
        data-hitl-kind={kind}
        className={cn(width, className)}
      >
        {icon ?? <ShieldAlert aria-hidden={false} />}
        <AlertTitle id={headingId}>{title}</AlertTitle>
        <AlertDescription>
          {description}
          {children}
          {submitting ? (
            <p className="m-0 text-xs text-muted-foreground" aria-live="polite">
              Submitting…
            </p>
          ) : null}
        </AlertDescription>
        {footer ? <AlertAction>{footer}</AlertAction> : null}
      </Alert>
    );
  }

  return (
    <Card
      render={<section />}
      aria-labelledby={headingId}
      data-tool-call-id={toolCallId}
      data-hitl-kind={kind}
      data-submitting={submitting ? "" : undefined}
      className={cn(
        width,
        "bg-muted/30 shadow-none transition-opacity duration-200 ease-out",
        submitting && "opacity-90",
        className
      )}
    >
      <CardHeader className="p-4">
        {/* Keep icon inside the title — a CardHeader sibling steals a grid cell. */}
        <CardTitle id={headingId} className={cn("text-sm", icon && "flex items-center gap-2")}>
          {icon}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      {children ? <CardPanel className="px-4 pb-2">{children}</CardPanel> : null}
      {footer ? (
        <CardFooter className="flex flex-wrap gap-2 border-t border-border/60 px-4 pt-3 pb-4">
          {footer}
        </CardFooter>
      ) : null}
      {submitting ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground" aria-live="polite">
          Submitting…
        </p>
      ) : null}
    </Card>
  );
}
