import { useRouter } from "@tanstack/react-router";
import { useCallback } from "react";

import { useGlobalShortcuts } from "@/shared/lib/use-global-shortcuts";

import { isOpen, setCommandPaletteOpen, useCommandPaletteOpen } from "./open-state";
import { getRegisteredCommands } from "./registry";

export function useCommandPalette() {
  const open = useCommandPaletteOpen();
  const router = useRouter();

  useGlobalShortcuts([
    {
      shortcut: { key: "k", mod: true },
      allowInEditable: true,
      onTrigger: () => {
        setCommandPaletteOpen(!isOpen());
      }
    },
    ...getRegisteredCommands().flatMap((cmd) => {
      if (!cmd.shortcut) return [];
      return [
        {
          shortcut: cmd.shortcut.map((key) => {
            return { key };
          }),
          enabled: !open,
          onTrigger: () => {
            if (cmd.action.type === "navigate") {
              void router.navigate({ to: cmd.action.to });
            } else {
              void cmd.action.fn();
            }
          }
        }
      ];
    })
  ]);

  const close = useCallback(() => setCommandPaletteOpen(false), []);

  return { open, setOpen: setCommandPaletteOpen, close };
}
