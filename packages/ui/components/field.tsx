"use client";

import { Field as FieldPrimitive } from "@base-ui/react/field";
import type React from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export function Field({ className, ...props }: FieldPrimitive.Root.Props): React.ReactElement {
  return (
    <FieldPrimitive.Root
      className={cn("flex flex-col items-start gap-2", className)}
      data-slot="field"
      {...props}
    />
  );
}

export function FieldLabel({
  className,
  ...props
}: FieldPrimitive.Label.Props): React.ReactElement {
  return (
    <FieldPrimitive.Label
      className={cn(
        "inline-flex items-center gap-2 text-base/4.5 font-medium text-foreground sm:text-sm/4 data-disabled:opacity-64",
        className
      )}
      data-slot="field-label"
      {...props}
    />
  );
}

export function FieldItem({ className, ...props }: FieldPrimitive.Item.Props): React.ReactElement {
  return (
    <FieldPrimitive.Item className={cn("flex", className)} data-slot="field-item" {...props} />
  );
}

export function FieldDescription({
  className,
  ...props
}: FieldPrimitive.Description.Props): React.ReactElement {
  return (
    <FieldPrimitive.Description
      className={cn("text-xs text-muted-foreground", className)}
      data-slot="field-description"
      {...props}
    />
  );
}

export function FieldError({
  className,
  errors,
  ...props
}: FieldPrimitive.Error.Props & {
  errors?: Array<{ message: string }>;
}): React.ReactElement {
  if (errors && errors.length > 0) {
    return (
      <div className={cn("text-xs text-destructive-foreground", className)} data-slot="field-error">
        {errors.map((error, i) => (
          <p key={i}>{error.message}</p>
        ))}
      </div>
    );
  }
  return (
    <FieldPrimitive.Error
      className={cn("text-xs text-destructive-foreground", className)}
      data-slot="field-error"
      {...props}
    />
  );
}

export const FieldControl: typeof FieldPrimitive.Control = FieldPrimitive.Control;
export const FieldValidity: typeof FieldPrimitive.Validity = FieldPrimitive.Validity;

export function FieldGroup({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-2", className)} data-slot="field-group" {...props} />
  );
}

export function FieldContent({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div className={cn("flex flex-col gap-1", className)} data-slot="field-content" {...props} />
  );
}

export function FieldTitle({
  className,
  ...props
}: React.ComponentProps<"span">): React.ReactElement {
  return (
    <span className={cn("text-sm font-medium", className)} data-slot="field-title" {...props} />
  );
}

export function FieldSeparator({
  className,
  children,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn("relative flex items-center gap-2", className)}
      data-slot="field-separator"
      {...props}
    >
      <div className="h-px flex-1 bg-border" />
      {children && <span className="text-xs text-muted-foreground">{children}</span>}
      <div className="h-px flex-1 bg-border" />
    </div>
  );
}

export function FieldSet({
  className,
  ...props
}: React.ComponentProps<"fieldset">): React.ReactElement {
  return (
    <fieldset className={cn("flex flex-col gap-4", className)} data-slot="field-set" {...props} />
  );
}

export { FieldPrimitive };
