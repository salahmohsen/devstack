"use client";

import { type AnyFormApi } from "@tanstack/react-form";
import { useSelector } from "@tanstack/react-store";
import { useEffect, useRef, useState } from "react";

/**
 * Dirty detection for entity create/edit panels that matches the applications form:
 * only true when current values differ from the snapshot taken right after
 * open + reset. Avoids false positives from Switch/Calendar/RichText mount
 * noise (isTouched + isDirty from empty create sheets).
 */
export function useEntityFormDirty(form: AnyFormApi, open: boolean): boolean {
  const values = useSelector(form.store, (s) => s.values);
  const [baseline, setBaseline] = useState<string | null>(null);
  const openGen = useRef(0);

  useEffect(() => {
    if (!open) {
      setBaseline(null);
      return;
    }
    const gen = ++openGen.current;
    // After the open-driven form.reset (and field mount), capture baseline.
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (openGen.current !== gen) return;
        setBaseline(JSON.stringify(form.store.state.values));
      });
    });
    return () => cancelAnimationFrame(id);
  }, [open, form]);

  if (!open || baseline == null) return false;
  return JSON.stringify(values) !== baseline;
}

/** Call after form.reset(...) on open so baseline can be refreshed immediately. */
export function snapshotFormValues(form: AnyFormApi): string {
  return JSON.stringify(form.store.state.values);
}
