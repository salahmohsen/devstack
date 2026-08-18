"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

import { Tooltip, TooltipPopup, TooltipTrigger } from "@tsu-stack/ui/components/tooltip";
import { cn } from "@tsu-stack/ui/lib/utils";

type TruncatedTextProps = {
  children: string;
  className?: string;
  /** Extra classes for the tooltip popup when the text is clipped. */
  tooltipClassName?: string;
  side?: ComponentProps<typeof TooltipPopup>["side"];
  align?: ComponentProps<typeof TooltipPopup>["align"];
};

/**
 * Single-line truncate with a tooltip that only opens when the text is actually clipped.
 * Put `min-w-0` / a max-width on this or a parent so truncation can take effect in flex layouts.
 */
export function TruncatedText({
  children,
  className,
  tooltipClassName,
  side = "top",
  align = "center"
}: TruncatedTextProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [truncated, setTruncated] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = () => {
      setTruncated(el.scrollWidth > el.clientWidth + 0.5);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [children]);

  return (
    <Tooltip disabled={!truncated}>
      <TooltipTrigger
        render={
          <span
            ref={(node) => {
              ref.current = node;
            }}
            className={cn("inline-block max-w-full min-w-0 truncate", className)}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipPopup side={side} align={align} className={tooltipClassName}>
        {children}
      </TooltipPopup>
    </Tooltip>
  );
}
