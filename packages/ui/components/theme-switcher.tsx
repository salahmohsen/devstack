"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";

import { Button, type ButtonProps } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";
import { cn } from "@tsu-stack/ui/lib/utils";

export { ThemeProvider } from "next-themes";

type ThemeReveal = "rectangle" | "none";
type ThemeRevealStart =
  | "bottom-up"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center";

type ThemeSwitcherProps = {
  className?: string;
  /**
   * View-transition reveal style (beui rectangle default).
   * Icon swap still uses the local IconMorph animation.
   */
  reveal?: ThemeReveal;
  /** Clip origin for the rectangle reveal. */
  start?: ThemeRevealStart;
} & ButtonProps;

const VT_STYLE_ID = "tsu-theme-toggle-vt";

const RECT_FROM: Record<ThemeRevealStart, string> = {
  "top-left": "inset(0 100% 100% 0)",
  "top-right": "inset(0 0 100% 100%)",
  "bottom-left": "inset(100% 100% 0 0)",
  "bottom-right": "inset(100% 0 0 100%)",
  center: "inset(50% 50% 50% 50%)",
  "bottom-up": "inset(100% 0 0 0)"
};

const VT_CSS = `
html[data-tsu-vt="rect"]::view-transition-old(root) {
  animation: none;
  mix-blend-mode: normal;
}
html[data-tsu-vt="rect"]::view-transition-new(root) {
  mix-blend-mode: normal;
  animation: tsu-rect-reveal 400ms cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes tsu-rect-reveal {
  from { clip-path: var(--tsu-vt-from, inset(100% 0 0 0)); }
  to   { clip-path: inset(0 0 0 0); }
}
`;

function subscribeThemeClass(onStoreChange: () => void) {
  const root = document.documentElement;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(root, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

function getIsDark() {
  return document.documentElement.classList.contains("dark");
}

function getServerIsDark() {
  return false;
}

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function ThemeSwitcher({
  reveal = "rectangle",
  start = "bottom-up",
  size = "icon",
  className,
  ...buttonProps
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const isDark = useSyncExternalStore(subscribeThemeClass, getIsDark, getServerIsDark);

  useEffect(() => {
    if (document.getElementById(VT_STYLE_ID)) return;
    const el = document.createElement("style");
    el.id = VT_STYLE_ID;
    el.textContent = VT_CSS;
    document.head.appendChild(el);
  }, []);

  const nextTheme =
    theme === "dark"
      ? "light"
      : theme === "light"
        ? "dark"
        : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark";

  function toggleTheme() {
    if (reveal === "none" || prefersReducedMotion() || !("startViewTransition" in document)) {
      setTheme(nextTheme);
      return;
    }

    const root = document.documentElement;
    root.style.setProperty("--tsu-vt-from", RECT_FROM[start]);
    root.dataset.tsuVt = "rect";

    const vt = (
      document as Document & {
        startViewTransition: (cb: () => void) => { finished: Promise<void> };
      }
    ).startViewTransition(() => {
      setTheme(nextTheme);
    });

    void vt.finished.finally(() => {
      delete root.dataset.tsuVt;
      root.style.removeProperty("--tsu-vt-from");
    });
  }

  return (
    <Button
      {...buttonProps}
      variant={buttonProps.variant ?? "ghost"}
      size={size}
      onClick={toggleTheme}
      aria-label="Toggle theme"
      className={cn(className)}
    >
      <IconMorph
        active={isDark}
        aria-hidden
        iconA={<Sun className="size-4" strokeWidth={2} />}
        iconB={<Moon className="size-4" strokeWidth={2} />}
      />
    </Button>
  );
}
