"use client";

import { useAui, useAuiState } from "@assistant-ui/react";
import * as React from "react";

import { useHubChat } from "@/features/agent-hub/api/use-hub-chat";
import {
  consumeHubApplicationPlant,
  getHubApplicationPlant,
  plantedComposerText,
  snapshotHubApplicationPlant,
  subscribeHubApplicationPlant
} from "@/features/agent-hub/lib/hub-assistant-open";

/**
 * Plants the Application mention chip via composer setText after historyReady.
 * Seed stays until send or the user clears the composer (not sticky).
 */
export function HubApplicationPlantEffect() {
  const aui = useAui();
  const { historyReady } = useHubChat();
  const plant = React.useSyncExternalStore(
    subscribeHubApplicationPlant,
    getHubApplicationPlant,
    getHubApplicationPlant
  );
  const composerText = useAuiState((state) => state.composer.text);
  const appliedNonceRef = React.useRef<number | null>(null);
  const seenPlantRef = React.useRef(false);

  React.useEffect(() => {
    if (!historyReady || !plant || plant.needsNewChat) return;
    const desired = plantedComposerText(plant);
    if (appliedNonceRef.current !== plant.nonce) {
      aui.composer.setText(desired);
      appliedNonceRef.current = plant.nonce;
      seenPlantRef.current = false;
      requestAnimationFrame(() => {
        const input = document.querySelector<HTMLElement>('[aria-label="Message input"]');
        input?.focus();
      });
      return;
    }
    if (composerText.includes(plant.directive)) {
      seenPlantRef.current = true;
      return;
    }
    if (!seenPlantRef.current) return;
    consumeHubApplicationPlant();
  }, [aui, composerText, historyReady, plant]);

  React.useEffect(
    () => () => {
      const current = getHubApplicationPlant();
      if (!current || !seenPlantRef.current) return;
      const text = aui.composer.getState().text ?? "";
      if (!text.includes(current.directive)) return;
      snapshotHubApplicationPlant(text);
    },
    [aui]
  );

  return null;
}
