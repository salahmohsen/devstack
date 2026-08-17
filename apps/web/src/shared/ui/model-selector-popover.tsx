"use client";

import { Popover as PopoverPrimitive } from "@base-ui/react/popover";
import * as React from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

/**
 * Thin popover wrappers for assistant-ui ModelSelector (shadcn-style PopoverContent API).
 * Built on the same Base UI Popover as `@tsu-stack/ui`.
 */
export const Popover = PopoverPrimitive.Root;

export function PopoverTrigger({
  className,
  ...props
}: PopoverPrimitive.Trigger.Props): React.ReactElement {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" className={className} {...props} />;
}

export type PopoverContentProps = PopoverPrimitive.Popup.Props &
  Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> & {
    className?: string;
  };

export const PopoverContent = React.forwardRef<HTMLDivElement, PopoverContentProps>(
  function PopoverContent(
    { className, align = "center", alignOffset = 0, side = "bottom", sideOffset = 4, ...props },
    ref
  ) {
    return (
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Positioner
          align={align}
          alignOffset={alignOffset}
          side={side}
          sideOffset={sideOffset}
          className="isolate z-60"
        >
          <PopoverPrimitive.Popup
            ref={ref}
            data-slot="popover-content"
            className={cn(
              "relative z-50 origin-(--transform-origin) rounded-xl border bg-popover text-popover-foreground shadow-lg outline-none",
              className
            )}
            {...props}
          />
        </PopoverPrimitive.Positioner>
      </PopoverPrimitive.Portal>
    );
  }
);
