import { useEffect } from "react";

import { subscribeSidePanelClose } from "@/shared/lib/side-panel-control";

/** Page-local inspect state (e.g. New jobs viewItem) should clear on dismiss. */
export function useSidePanelClose(onClose: () => void): void {
  useEffect(() => subscribeSidePanelClose(onClose), [onClose]);
}
