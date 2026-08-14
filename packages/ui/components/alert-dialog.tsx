"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import type React from "react";

import { BadgeTopGlow } from "@tsu-stack/ui/components/badge-effects";
import {
  buttonGlowSize,
  buttonGlowVariant,
  buttonVariants,
  type ButtonProps
} from "@tsu-stack/ui/components/button";
import {
  DialogStatusAction,
  dialogStatusSize,
  labelFromChildren
} from "@tsu-stack/ui/components/dialog-status-action";
import { cn } from "@tsu-stack/ui/lib/utils";

export const AlertDialogCreateHandle: typeof AlertDialogPrimitive.createHandle =
  AlertDialogPrimitive.createHandle;

export const AlertDialog: typeof AlertDialogPrimitive.Root = AlertDialogPrimitive.Root;

export const AlertDialogPortal: typeof AlertDialogPrimitive.Portal = AlertDialogPrimitive.Portal;

export function AlertDialogTrigger(props: AlertDialogPrimitive.Trigger.Props): React.ReactElement {
  return <AlertDialogPrimitive.Trigger data-slot="alert-dialog-trigger" {...props} />;
}

export function AlertDialogBackdrop({
  className,
  ...props
}: AlertDialogPrimitive.Backdrop.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Backdrop
      className={cn("t-modal-backdrop fixed inset-0 z-50 bg-black/32 backdrop-blur-sm", className)}
      data-slot="alert-dialog-backdrop"
      {...props}
    />
  );
}

export function AlertDialogViewport({
  className,
  ...props
}: AlertDialogPrimitive.Viewport.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Viewport
      className={cn(
        "fixed inset-0 z-50 grid grid-rows-[1fr_auto_3fr] justify-items-center p-4",
        className
      )}
      data-slot="alert-dialog-viewport"
      {...props}
    />
  );
}

export function AlertDialogPopup({
  className,
  bottomStickOnMobile = true,
  portalProps,
  ...props
}: AlertDialogPrimitive.Popup.Props & {
  bottomStickOnMobile?: boolean;
  portalProps?: AlertDialogPrimitive.Portal.Props;
}): React.ReactElement {
  return (
    <AlertDialogPortal {...portalProps}>
      <AlertDialogBackdrop />
      <AlertDialogViewport
        className={cn(bottomStickOnMobile && "max-sm:grid-rows-[1fr_auto] max-sm:p-0 max-sm:pt-12")}
      >
        <AlertDialogPrimitive.Popup
          className={cn(
            "t-modal relative row-start-2 flex max-h-full min-h-0 w-full max-w-lg min-w-0 origin-center flex-col rounded-2xl border bg-popover text-popover-foreground opacity-[calc(1-var(--nested-dialogs))] shadow-lg/5 outline-none not-dark:bg-clip-padding before:pointer-events-none before:absolute before:inset-0 before:rounded-[calc(var(--radius-2xl)-1px)] before:shadow-[0_1px_--theme(--color-black/4%)] sm:scale-[calc(1-0.1*var(--nested-dialogs))] dark:before:shadow-[0_-1px_--theme(--color-white/6%)]",
            bottomStickOnMobile &&
              "max-sm:max-w-none max-sm:origin-bottom max-sm:rounded-none max-sm:border-x-0 max-sm:border-t max-sm:border-b-0 max-sm:before:hidden max-sm:before:rounded-none max-sm:data-ending-style:translate-y-4 max-sm:data-starting-style:translate-y-4",
            className
          )}
          data-slot="alert-dialog-popup"
          {...props}
        />
      </AlertDialogViewport>
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">): React.ReactElement {
  return (
    <div
      className={cn("flex flex-col gap-2 p-6 text-center max-sm:pb-4 sm:text-left", className)}
      data-slot="alert-dialog-header"
      {...props}
    />
  );
}

export function AlertDialogFooter({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & {
  variant?: "default" | "bare";
}): React.ReactElement {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end sm:rounded-b-[calc(var(--radius-2xl)-1px)]",
        variant === "default" && "border-t bg-muted/72 py-4",
        variant === "bare" && "pb-6",
        className
      )}
      data-slot="alert-dialog-footer"
      {...props}
    />
  );
}

export function AlertDialogTitle({
  className,
  ...props
}: AlertDialogPrimitive.Title.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Title
      className={cn("font-heading text-xl leading-none font-semibold", className)}
      data-slot="alert-dialog-title"
      {...props}
    />
  );
}

export function AlertDialogDescription({
  className,
  ...props
}: AlertDialogPrimitive.Description.Props): React.ReactElement {
  return (
    <AlertDialogPrimitive.Description
      className={cn("text-sm text-muted-foreground", className)}
      data-slot="alert-dialog-description"
      {...props}
    />
  );
}

export function AlertDialogClose(props: AlertDialogPrimitive.Close.Props): React.ReactElement {
  return <AlertDialogPrimitive.Close data-slot="alert-dialog-close" {...props} />;
}

type AlertDialogButtonCloseProps = AlertDialogPrimitive.Close.Props &
  Pick<ButtonProps, "variant" | "size"> & {
    /**
     * When set, the dialog stays open on click so the pending glow can play.
     * Parent should close after the work finishes.
     */
    loading?: boolean;
    icon?: React.ReactNode;
  };

function AlertDialogButtonClose({
  className,
  variant,
  size = "sm",
  children,
  slot,
  loading,
  disabled,
  icon,
  onClick,
  ...props
}: AlertDialogButtonCloseProps & { slot: string }): React.ReactElement {
  const label = labelFromChildren(children);
  const isBusy = loading === true;
  const isDisabled = disabled === true || isBusy;

  if (label != null) {
    return (
      <AlertDialogPrimitive.Close
        data-slot={slot}
        disabled={isDisabled}
        className={typeof className === "string" ? className : undefined}
        render={
          <DialogStatusAction
            variant={variant}
            size={dialogStatusSize(size)}
            loading={isBusy}
            label={label}
            icon={icon}
            disabled={isDisabled}
          />
        }
        onClick={(event) => {
          if (loading !== undefined) {
            event.preventDefault();
          }
          onClick?.(event);
        }}
        {...props}
      />
    );
  }

  const glow = buttonGlowVariant(variant);
  return (
    <AlertDialogPrimitive.Close
      className={cn(buttonVariants({ variant, size }), className)}
      data-slot={slot}
      disabled={isDisabled}
      onClick={onClick}
      {...props}
    >
      {glow ? <BadgeTopGlow variant={glow} size={buttonGlowSize(size)} /> : null}
      {children}
    </AlertDialogPrimitive.Close>
  );
}

export function AlertDialogAction({
  variant = "default",
  ...props
}: AlertDialogButtonCloseProps): React.ReactElement {
  return <AlertDialogButtonClose slot="alert-dialog-action" variant={variant} {...props} />;
}

export function AlertDialogCancel({
  variant = "outline",
  ...props
}: AlertDialogButtonCloseProps): React.ReactElement {
  return <AlertDialogButtonClose slot="alert-dialog-cancel" variant={variant} {...props} />;
}

export {
  AlertDialogPrimitive,
  AlertDialogBackdrop as AlertDialogOverlay,
  AlertDialogPopup as AlertDialogContent
};
