import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { Button, type ButtonProps } from "@tsu-stack/ui/components/button";
import { IconMorph } from "@tsu-stack/ui/components/icon-motion";

export { ThemeProvider } from "next-themes";

type ThemeSwitcherProps = {
  className?: string;
} & ButtonProps;

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

export function ThemeSwitcher({ variant = "ghost", size = "icon", className }: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme();
  const isDark = useSyncExternalStore(subscribeThemeClass, getIsDark, getServerIsDark);

  const changeThemeValue =
    theme === "dark"
      ? "light"
      : theme === "light"
        ? "dark"
        : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "light"
          : "dark";

  return (
    <Button
      variant={variant}
      size={size}
      onClick={() => setTheme(changeThemeValue)}
      aria-label="Toggle theme"
      className={className}
    >
      <IconMorph
        active={isDark}
        aria-hidden
        iconA={<Sun size={18} strokeWidth={2} />}
        iconB={<Moon size={18} strokeWidth={2} />}
      />
    </Button>
  );
}
