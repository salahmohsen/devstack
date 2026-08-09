import { useRouter } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";

import { useGlobalShortcuts } from "@/shared/lib/use-global-shortcuts";

import { isOpen, setCommandPaletteOpen, useCommandPaletteOpen } from "./open-state";
import { useCommandItems } from "./use-command-items";

export function useCommandPalette() {
  const open = useCommandPaletteOpen();
  const router = useRouter();
  // Filtered list (auth-gated items excluded when signed out).
  const items = useCommandItems();

  const shortcutDefs = useMemo(
    () =>
      items.flatMap((cmd) => {
        if (!cmd.shortcut) return [];
        return [
          {
            shortcut: cmd.shortcut.map((key) => {
              return { key };
            }),
            enabled: !open,
            onTrigger: () => {
              if (cmd.action.type === "navigate") {
                void router.navigate({
                  to: cmd.action.to as never,
                  params: cmd.action.params as never
                });
              } else {
                void cmd.action.fn();
              }
            }
          }
        ];
      }),
    [items, open, router]
  );

  useGlobalShortcuts([
    {
      shortcut: { key: "k", mod: true },
      allowInEditable: true,
      onTrigger: () => {
        setCommandPaletteOpen(!isOpen());
      }
    },
    ...shortcutDefs
  ]);

  const close = useCallback(() => setCommandPaletteOpen(false), []);

  return { open, setOpen: setCommandPaletteOpen, close, items };
}
