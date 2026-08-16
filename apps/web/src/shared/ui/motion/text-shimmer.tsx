import { type ElementType, type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import {
  TEXT_SHIMMER_CLASS_NAME,
  TEXT_SHIMMER_KEYFRAMES,
  textShimmerStyle
} from "@/shared/lib/text-shimmer";

export function TextShimmer({
  children,
  as: Comp = "span",
  duration = 2.5,
  className
}: {
  children: ReactNode;
  as?: ElementType;
  duration?: number;
  className?: string;
}) {
  return (
    <>
      <style>{TEXT_SHIMMER_KEYFRAMES}</style>
      <Comp
        style={textShimmerStyle(duration)}
        className={cn("inline-block", TEXT_SHIMMER_CLASS_NAME, className)}
      >
        {children}
      </Comp>
    </>
  );
}
