import { useEffect, useEffectEvent, useRef } from "react";

type KeyboardEventSource = Pick<
  KeyboardEvent,
  "altKey" | "code" | "ctrlKey" | "key" | "metaKey" | "shiftKey"
>;

export type ShortcutStep = {
  alt?: boolean;
  code?: string;
  ctrl?: boolean;
  key?: string;
  meta?: boolean;
  mod?: boolean;
  shift?: boolean;
};

export type ShortcutDefinition = {
  allowInEditable?: boolean;
  enabled?: boolean;
  onTrigger: (event: KeyboardEvent) => void;
  preventDefault?: boolean;
  shortcut: ShortcutStep | ShortcutStep[];
  stopPropagation?: boolean;
};

const SEQUENCE_TIMEOUT_MS = 800;

function normalizeShortcut(shortcut: ShortcutDefinition["shortcut"]) {
  return Array.isArray(shortcut) ? shortcut : [shortcut];
}

function toSnapshot(event: KeyboardEvent): KeyboardEventSource {
  return {
    altKey: event.altKey,
    code: event.code,
    ctrlKey: event.ctrlKey,
    key: event.key,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey
  };
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  const tagName = element?.tagName;
  if (tagName === "INPUT" || tagName === "SELECT" || tagName === "TEXTAREA") {
    return true;
  }

  return element?.isContentEditable ?? false;
}

function matchesShortcut(event: KeyboardEventSource, shortcut: ShortcutStep) {
  if (shortcut.key && event.key.toLowerCase() !== shortcut.key.toLowerCase()) {
    return false;
  }

  if (shortcut.code && event.code !== shortcut.code) {
    return false;
  }

  if (event.shiftKey !== (shortcut.shift ?? false)) {
    return false;
  }

  if (event.altKey !== (shortcut.alt ?? false)) {
    return false;
  }

  if (shortcut.mod != null) {
    if ((event.metaKey || event.ctrlKey) !== shortcut.mod) {
      return false;
    }
  } else {
    if (event.metaKey !== (shortcut.meta ?? false)) {
      return false;
    }

    if (event.ctrlKey !== (shortcut.ctrl ?? false)) {
      return false;
    }
  }

  return true;
}

function sequenceStartsWith(events: KeyboardEventSource[], shortcut: ShortcutStep[]) {
  if (events.length > shortcut.length) {
    return false;
  }

  return events.every((event, index) => matchesShortcut(event, shortcut[index]));
}

export function useGlobalShortcuts(shortcuts: ShortcutDefinition[]) {
  const sequenceRef = useRef<KeyboardEventSource[]>([]);
  const sequenceTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const resetSequence = useEffectEvent(() => {
    sequenceRef.current = [];
    clearTimeout(sequenceTimerRef.current);
  });

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    const editable = isEditableTarget(event.target);

    for (const definition of shortcuts) {
      if (definition.enabled === false) {
        continue;
      }
      if (editable && !definition.allowInEditable) {
        continue;
      }

      const steps = normalizeShortcut(definition.shortcut);
      if (steps.length === 1 && matchesShortcut(event, steps[0])) {
        if (definition.preventDefault !== false) {
          event.preventDefault();
        }
        if (definition.stopPropagation) {
          event.stopPropagation();
        }
        resetSequence();
        definition.onTrigger(event);
        return;
      }
    }

    const nextSequence = [...sequenceRef.current, toSnapshot(event)];
    clearTimeout(sequenceTimerRef.current);

    const matchingSequence = shortcuts.find((definition) => {
      if (definition.enabled === false) {
        return false;
      }
      if (editable && !definition.allowInEditable) {
        return false;
      }

      const steps = normalizeShortcut(definition.shortcut);
      return (
        steps.length > 1 &&
        steps.length === nextSequence.length &&
        sequenceStartsWith(nextSequence, steps)
      );
    });

    if (matchingSequence) {
      if (matchingSequence.preventDefault !== false) {
        event.preventDefault();
      }
      if (matchingSequence.stopPropagation) {
        event.stopPropagation();
      }
      resetSequence();
      matchingSequence.onTrigger(event);
      return;
    }

    const hasPrefix = shortcuts.some((definition) => {
      if (definition.enabled === false) {
        return false;
      }
      if (editable && !definition.allowInEditable) {
        return false;
      }

      const steps = normalizeShortcut(definition.shortcut);
      return steps.length > 1 && sequenceStartsWith(nextSequence, steps);
    });

    if (hasPrefix) {
      sequenceRef.current = nextSequence;
      sequenceTimerRef.current = setTimeout(resetSequence, SEQUENCE_TIMEOUT_MS);
      return;
    }

    resetSequence();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(sequenceTimerRef.current);
    };
  }, []);
}
