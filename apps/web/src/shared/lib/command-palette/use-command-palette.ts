import { useCallback } from "react";

import { setCommandPaletteOpen, useCommandPaletteOpen } from "./open-state";
import { useCommandItems } from "./use-command-items";

export function useCommandPalette(q = "") {
  const open = useCommandPaletteOpen();
  const items = useCommandItems(q);
  const close = useCallback(() => setCommandPaletteOpen(false), []);

  return { open, setOpen: setCommandPaletteOpen, close, items };
}
