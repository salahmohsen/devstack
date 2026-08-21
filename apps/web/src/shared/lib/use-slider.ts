"use client";

import { type KeyboardEvent, type PointerEvent, useCallback, useRef, useState } from "react";

import { capturePointer, releasePointer } from "@/shared/lib/touch";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Nearest legal value on [min, max] for the given step. */
export function snapSliderValue(next: number, min: number, max: number, step: number): number {
  if (!(max > min)) return min;
  if (!(step > 0)) return clamp(next, min, max);
  const whole = Math.floor(Number(((max - min) / step).toFixed(6)));
  const lastWhole = Number((min + whole * step).toFixed(6));
  const toGrid = clamp(Math.round((next - min) / step) * step + min, min, lastWhole);
  const snapped = lastWhole < max && Math.abs(next - max) <= Math.abs(next - toGrid) ? max : toGrid;
  return Number(snapped.toFixed(6));
}

export type SliderOptions = {
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  onCommit?: () => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  formatValueText?: (value: number) => string;
};

export function useSlider({
  value,
  defaultValue = 0,
  onValueChange,
  onCommit,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  formatValueText
}: SliderOptions) {
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderEl = useRef<HTMLElement | null>(null);
  const draggingRef = useRef(false);
  const [internal, setInternal] = useState(defaultValue);
  const [dragging, setDragging] = useState(false);
  const controlled = value !== undefined;
  const lo = min;
  const hi = max > min ? max : min;
  const stride = step > 0 ? step : 1;
  const current = clamp(controlled ? value : internal, lo, hi);
  const percent = hi > lo ? ((current - lo) / (hi - lo)) * 100 : 0;

  const commit = useCallback(
    (next: number) => {
      const clean = snapSliderValue(next, lo, hi, stride);
      if (!controlled) setInternal(clean);
      onValueChange?.(clean);
    },
    [controlled, onValueChange, lo, hi, stride]
  );

  const commitFromX = useCallback(
    (clientX: number) => {
      const rect = trackRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      const ratio = clamp((clientX - rect.left) / rect.width, 0, 1);
      commit(lo + ratio * (hi - lo));
    },
    [commit, lo, hi]
  );

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      draggingRef.current = true;
      setDragging(true);
      capturePointer(event.currentTarget, event.pointerId);
      sliderEl.current?.focus({ preventScroll: true });
      commitFromX(event.clientX);
    },
    [disabled, commitFromX]
  );

  const onPointerMove = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!draggingRef.current || disabled) return;
      commitFromX(event.clientX);
    },
    [disabled, commitFromX]
  );

  const endDrag = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      releasePointer(event.currentTarget, event.pointerId);
      const wasDragging = draggingRef.current;
      draggingRef.current = false;
      setDragging(false);
      if (wasDragging) onCommit?.();
    },
    [onCommit]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      const map: Record<string, number> = {
        ArrowRight: current + stride,
        ArrowUp: current + stride,
        ArrowLeft: current - stride,
        ArrowDown: current - stride,
        PageUp: current + stride * 10,
        PageDown: current - stride * 10,
        Home: lo,
        End: hi
      };
      if (event.key in map) {
        event.preventDefault();
        commit(map[event.key]);
        onCommit?.();
      }
    },
    [disabled, current, stride, lo, hi, commit, onCommit]
  );

  return {
    current,
    percent,
    dragging,
    min: lo,
    max: hi,
    step: stride,
    commit,
    trackProps: {
      ref: trackRef,
      onPointerDown,
      onPointerMove,
      onPointerUp: endDrag,
      onPointerCancel: endDrag,
      onLostPointerCapture: endDrag
    },
    sliderProps: {
      ref: (node: HTMLElement | null) => {
        sliderEl.current = node;
      },
      id,
      role: "slider" as const,
      tabIndex: disabled ? -1 : 0,
      "aria-label": ariaLabel,
      "aria-valuemin": lo,
      "aria-valuemax": hi,
      "aria-valuenow": current,
      "aria-valuetext": formatValueText?.(current),
      "aria-disabled": disabled || undefined,
      onKeyDown
    }
  };
}
