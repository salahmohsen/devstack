/** Motion tokens used by beUI PreviewRail / MessageScroller. */
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;

export const SPRING_LAYOUT = {
  type: "spring",
  stiffness: 360,
  damping: 32,
  mass: 0.6
} as const;

export const SPRING_SWAP = {
  type: "spring",
  stiffness: 460,
  damping: 30,
  mass: 0.55
} as const;

/** Press feedback on File Diff copy and other tappable agent chrome. */
export const SPRING_PRESS = {
  type: "spring",
  stiffness: 500,
  damping: 30,
  mass: 0.6
} as const;

/** Dragged handles and fills (sliders) — critically damped `useSpring`. */
export const SPRING_GLIDE = {
  stiffness: 700,
  damping: 50,
  mass: 0.5
} as const;

/** Cursor-follow tilt / glare (`useSpring` on pointer). */
export const SPRING_MOUSE = {
  stiffness: 400,
  damping: 40,
  mass: 0.5
} as const;
