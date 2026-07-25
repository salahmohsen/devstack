import type * as React from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type IconSwapState = "a" | "b";

export type IconSwapProps = {
  /** Which icon is visible. Ignored when `themeSwap` or `hoverSwap` is set. */
  state?: IconSwapState;
  iconA: React.ReactNode;
  iconB: React.ReactNode;
  /**
   * Drive the swap from `html.dark` instead of `state`
   * (e.g. sun ↔ moon theme toggle).
   */
  themeSwap?: boolean;
  /**
   * Show icon B while the swap (or a parent `.group`) is hovered / open.
   * Default state is A.
   */
  hoverSwap?: boolean;
  className?: string;
  iconClassName?: string;
} & Omit<React.ComponentProps<"span">, "children">;

/**
 * Cross-fade two icons in the same slot (transitions-dev icon-swap).
 * Both icons stay mounted and stacked in one grid cell.
 */
export function IconSwap({
  state = "a",
  iconA,
  iconB,
  themeSwap = false,
  hoverSwap = false,
  className,
  iconClassName,
  ...props
}: IconSwapProps): React.ReactElement {
  return (
    <span
      className={cn("t-icon-swap", className)}
      data-state={themeSwap || hoverSwap ? undefined : state}
      data-theme-swap={themeSwap ? "" : undefined}
      data-hover-swap={hoverSwap ? "" : undefined}
      data-slot="icon-swap"
      {...props}
    >
      <span className={cn("t-icon", iconClassName)} data-icon="a" data-slot="icon-swap-a">
        {iconA}
      </span>
      <span className={cn("t-icon", iconClassName)} data-icon="b" data-slot="icon-swap-b">
        {iconB}
      </span>
    </span>
  );
}
