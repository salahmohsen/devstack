"use client";

import { play } from "cuelume";
import { useCallback, useEffect, useRef, useState } from "react";

export type UseCopyToClipboardOptions = {
  /** How long the "copied" state stays true (ms). Default 1500. */
  resetMs?: number;
  onCopied?: (value: string) => void;
  onError?: (error: unknown) => void;
};

/**
 * Clipboard write + brief "copied" state for morph animations.
 */
export function useCopyToClipboard(options: UseCopyToClipboardOptions = {}) {
  const { resetMs = 1500, onCopied, onError } = options;
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    },
    []
  );

  const copy = useCallback(
    async (value: string) => {
      if (!value) return false;
      try {
        await navigator.clipboard.writeText(value);
        play("success");
        setCopied(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => setCopied(false), resetMs);
        onCopied?.(value);
        return true;
      } catch (error) {
        play("error");
        onError?.(error);
        return false;
      }
    },
    [onCopied, onError, resetMs]
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setCopied(false);
  }, []);

  return { copied, copy, reset };
}
