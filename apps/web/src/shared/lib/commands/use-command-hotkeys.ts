import { getSequenceManager, useHotkeys, useHotkeySequences } from "@tanstack/react-hotkeys";
import { useRouter } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef } from "react";

import {
  isOpen,
  setCommandPaletteOpen,
  useCommandPaletteOpen
} from "@/shared/lib/command-palette/open-state";
import { useCommandItems } from "@/shared/lib/command-palette/use-command-items";

import { getCommandEnabled, useCommandBindings, useRecordingCommandId } from "./bindings-store";
import { COMMAND_BY_ID } from "./catalog";
import {
  isShortcutCheatsheetOpen,
  setShortcutCheatsheetOpen,
  useShortcutCheatsheetOpen
} from "./cheatsheet-state";
import { sequenceIsPrefixOf } from "./display";
import { getCommandHandler } from "./execute";
import { COMMAND_SEQUENCE_TIMEOUT_MS, type CommandBinding, type CommandId } from "./types";

type PendingPrefix = {
  commandId: CommandId;
  sequence: readonly string[];
  timeoutId: ReturnType<typeof setTimeout>;
  armed: boolean;
};

function isCommandAvailable(id: CommandId, hasPaletteItem: boolean): boolean {
  const command = COMMAND_BY_ID[id];
  if (!command.gated) return getCommandEnabled(id);
  return getCommandEnabled(id) || hasPaletteItem || Boolean(getCommandHandler(id));
}

export function useCommandHotkeys() {
  const router = useRouter();
  const items = useCommandItems();
  const bindings = useCommandBindings();
  const paletteOpen = useCommandPaletteOpen();
  const cheatsheetOpen = useShortcutCheatsheetOpen();
  const overlayOpen = paletteOpen || cheatsheetOpen;
  const recordingCommandId = useRecordingCommandId();
  const pendingRef = useRef<PendingPrefix | null>(null);

  const itemsById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const runCommand = useCallback(
    (id: CommandId) => {
      if (id === "palette.toggle") {
        setShortcutCheatsheetOpen(false);
        setCommandPaletteOpen(!isOpen());
        return;
      }
      if (id === "shortcuts.cheatsheet") {
        setCommandPaletteOpen(false);
        setShortcutCheatsheetOpen(!isShortcutCheatsheetOpen());
        return;
      }

      const handler = getCommandHandler(id);
      if (handler) {
        handler();
        return;
      }

      const item = itemsById.get(id);
      if (!item) return;
      if (item.action.type === "navigate") {
        void router.navigate({
          to: item.action.to as never,
          params: item.action.params as never
        });
        return;
      }
      void item.action.fn();
    },
    [itemsById, router]
  );

  const clearPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingRef.current = null;
  }, []);

  const flushPending = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timeoutId);
    pendingRef.current = null;
    runCommand(pending.commandId);
  }, [runCommand]);

  const longerSequenceStillMatching = useCallback((sequence: readonly string[]) => {
    const views = getSequenceManager().registrations.state;
    for (const view of views.values()) {
      if (sequenceIsPrefixOf(sequence, view.sequence) && view.matchedStepCount >= sequence.length) {
        return true;
      }
    }
    return false;
  }, []);

  const enabledSequences = useMemo(() => {
    const sequences: string[][] = [];
    for (const [id, binding] of Object.entries(bindings) as [CommandId, CommandBinding | null][]) {
      if (!binding || binding.kind !== "sequence") continue;
      if (recordingCommandId) continue;
      if (overlayOpen && COMMAND_BY_ID[id].scope === "palette-closed") continue;
      if (!isCommandAvailable(id, itemsById.has(id))) continue;
      sequences.push(binding.sequence);
    }
    return sequences;
  }, [bindings, itemsById, overlayOpen, recordingCommandId]);

  const onSequenceComplete = useCallback(
    (id: CommandId, sequence: readonly string[]) => {
      const pending = pendingRef.current;
      if (pending && sequenceIsPrefixOf(pending.sequence, sequence)) {
        clearPending();
      }

      const hasLonger = enabledSequences.some((other) => sequenceIsPrefixOf(sequence, other));
      if (!hasLonger) {
        runCommand(id);
        return;
      }

      clearPending();
      const timeoutId = setTimeout(() => {
        pendingRef.current = null;
        runCommand(id);
      }, COMMAND_SEQUENCE_TIMEOUT_MS);
      pendingRef.current = { commandId: id, sequence, timeoutId, armed: false };

      queueMicrotask(() => {
        const current = pendingRef.current;
        if (!current || current.commandId !== id) return;
        current.armed = true;
        if (!longerSequenceStillMatching(sequence)) {
          flushPending();
        }
      });
    },
    [clearPending, enabledSequences, flushPending, longerSequenceStillMatching, runCommand]
  );

  useEffect(() => {
    const manager = getSequenceManager();
    const subscription = manager.registrations.subscribe(() => {
      const pending = pendingRef.current;
      if (!pending?.armed) return;
      if (!longerSequenceStillMatching(pending.sequence)) {
        flushPending();
      }
    });
    return () => {
      subscription.unsubscribe();
      clearPending();
    };
  }, [clearPending, flushPending, longerSequenceStillMatching]);

  const hotkeyDefs = useMemo(
    () =>
      (Object.entries(bindings) as [CommandId, CommandBinding | null][]).flatMap(
        ([id, binding]) => {
          if (!binding || binding.kind !== "hotkey") return [];
          const command = COMMAND_BY_ID[id];
          const enabled =
            !recordingCommandId &&
            isCommandAvailable(id, itemsById.has(id)) &&
            (command.scope !== "palette-closed" || !overlayOpen);
          return [
            {
              hotkey: binding.hotkey,
              callback: () => {
                runCommand(id);
              },
              options: {
                enabled,
                conflictBehavior: "replace" as const,
                ignoreInputs: id === "panel.close" ? true : undefined,
                requireReset: id === "panel.close" ? true : undefined,
                meta: {
                  name: command.label,
                  description: command.description
                }
              }
            }
          ];
        }
      ),
    [bindings, itemsById, overlayOpen, recordingCommandId, runCommand]
  );

  const sequenceDefs = useMemo(
    () =>
      (Object.entries(bindings) as [CommandId, CommandBinding | null][]).flatMap(
        ([id, binding]) => {
          if (!binding || binding.kind !== "sequence") return [];
          const command = COMMAND_BY_ID[id];
          const enabled =
            !recordingCommandId &&
            isCommandAvailable(id, itemsById.has(id)) &&
            (command.scope !== "palette-closed" || !overlayOpen);
          return [
            {
              sequence: binding.sequence,
              callback: () => {
                onSequenceComplete(id, binding.sequence);
              },
              options: {
                enabled,
                timeout: COMMAND_SEQUENCE_TIMEOUT_MS,
                ignoreInputs: true,
                conflictBehavior: "replace" as const,
                meta: {
                  name: command.label,
                  description: command.description
                }
              }
            }
          ];
        }
      ),
    [bindings, itemsById, onSequenceComplete, overlayOpen, recordingCommandId]
  );

  useHotkeys(hotkeyDefs, { preventDefault: true, stopPropagation: true });
  useHotkeySequences(sequenceDefs, {
    preventDefault: true,
    stopPropagation: true,
    timeout: COMMAND_SEQUENCE_TIMEOUT_MS
  });
}
