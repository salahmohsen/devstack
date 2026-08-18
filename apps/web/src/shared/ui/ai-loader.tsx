import { Dotm3x3_11 } from "@tsu-stack/ui/components/dotm-3x3-11";
import { cn } from "@tsu-stack/ui/lib/utils";

export const AiLoader = ({
  className,
  variant = "inline",
  size = "md"
}: {
  className?: string;
  variant?: "fill" | "inline";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
}) => (
  <Dotm3x3_11
    className={cn(variant === "inline" ? "inline-flex" : "min-w-full py-16", className)}
    size={
      size === "xs"
        ? 12
        : size === "sm"
          ? 16
          : size === "md"
            ? 24
            : size === "lg"
              ? 32
              : size === "xl"
                ? 40
                : 28
    }
    dotSize={
      size === "xs"
        ? 2
        : size === "sm"
          ? 3
          : size === "md"
            ? 4
            : size === "lg"
              ? 5
              : size === "xl"
                ? 6
                : 4
    }
    speed={1.2}
  />
);
