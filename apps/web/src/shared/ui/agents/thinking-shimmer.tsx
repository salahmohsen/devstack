import { type ReactNode } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

import { TextShimmer } from "@/shared/ui/motion/text-shimmer";

export function ThinkingShimmer({
  children = "Thinking…",
  duration = 1.8,
  className
}: {
  children?: ReactNode;
  duration?: number;
  className?: string;
}) {
  return (
    <TextShimmer as="span" duration={duration} className={cn("font-medium", className)}>
      {children}
    </TextShimmer>
  );
}
