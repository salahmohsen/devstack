import { motion, stagger, useAnimate, type AnimationOptions } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@tsu-stack/ui/lib/utils";

export type VariableFontHoverByLetterProps = {
  label: string;
  fromFontVariationSettings?: string;
  toFontVariationSettings?: string;
  transition?: AnimationOptions;
  staggerDuration?: number;
  staggerFrom?: "first" | "last" | "center" | number;
  className?: string;
  onClick?: () => void;
  /**
   * When set, drives the hover animation from outside (e.g. parent card hover).
   * When omitted, the component reacts to its own pointer hover.
   */
  active?: boolean;
} & Omit<ComponentPropsWithoutRef<typeof motion.span>, "children" | "onClick">;

/**
 * Animates per-letter `font-variation-settings` on hover.
 * Requires a variable font with the axes you animate (Geist ships `wght` only).
 *
 * @see https://fancycomponents.dev/docs/components/components/text/variable-font-hover-by-letter
 */
function VariableFontHoverByLetter({
  label,
  // Geist Variable exposes wght 100–900 only (no slnt axis).
  fromFontVariationSettings = "'wght' 600",
  toFontVariationSettings = "'wght' 900",
  transition = {
    type: "spring",
    duration: 0.7
  },
  staggerDuration = 0.03,
  staggerFrom = "first",
  className,
  onClick,
  active,
  ...props
}: VariableFontHoverByLetterProps) {
  const [scope, animate] = useAnimate();
  const [selfHovered, setSelfHovered] = useState(false);
  const controlled = active !== undefined;
  // Debounce window so rapid hover enter/leave doesn't thrash letter springs.
  const lockUntilRef = useRef(0);
  const prevActiveRef = useRef(active);

  const play = useCallback(
    (toActive: boolean) => {
      void animate(
        ".letter",
        {
          fontVariationSettings: toActive ? toFontVariationSettings : fromFontVariationSettings
        },
        {
          ...transition,
          delay: stagger(staggerDuration, {
            from: staggerFrom
          })
        }
      );
    },
    [
      animate,
      fromFontVariationSettings,
      toFontVariationSettings,
      transition,
      staggerDuration,
      staggerFrom
    ]
  );

  // Controlled: parent owns hover (project card). Skip no-op re-runs.
  useEffect(() => {
    if (!controlled) return;
    if (prevActiveRef.current === active) return;
    prevActiveRef.current = active;
    play(Boolean(active));
  }, [active, controlled, play]);

  const trySelfHover = useCallback(
    (next: boolean) => {
      if (controlled) return;
      const now = Date.now();
      if (now < lockUntilRef.current) return;
      lockUntilRef.current = now + 100;
      setSelfHovered(next);
      play(next);
    },
    [controlled, play]
  );

  return (
    <motion.span
      ref={scope}
      className={cn("inline", className)}
      onHoverStart={controlled ? undefined : () => trySelfHover(true)}
      onHoverEnd={controlled ? undefined : () => trySelfHover(false)}
      onClick={onClick}
      data-hovered={controlled ? active : selfHovered}
      style={{
        fontVariationSettings: fromFontVariationSettings,
        fontWeight: 600
      }}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {label.split("").map((letter, i) => (
        <motion.span
          key={`${letter}-${i}`}
          className="letter inline-block whitespace-pre"
          aria-hidden="true"
          style={{ fontVariationSettings: fromFontVariationSettings }}
        >
          {letter}
        </motion.span>
      ))}
    </motion.span>
  );
}

export { VariableFontHoverByLetter };
