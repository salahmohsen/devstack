/** Gesture surfaces that own the pointer (thumbs, sliders, drums). */
export const TOUCH_GESTURE_CLASS = "select-none [-webkit-touch-callout:none]";

export function capturePointer(el: HTMLElement, pointerId: number) {
  el.setPointerCapture?.(pointerId);
}

export function releasePointer(el: HTMLElement, pointerId: number) {
  if (el.hasPointerCapture?.(pointerId)) {
    el.releasePointerCapture(pointerId);
  }
}
