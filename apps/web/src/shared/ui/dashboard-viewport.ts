/**
 * Locked island pages (mail, settings, admin) that fill the dashboard card.
 * Height accounts for the topbar only.
 */
export const DASHBOARD_VIEWPORT_PAGE_CLASSNAME =
  "flex h-[calc(100dvh-var(--navbar-height)-10px)] min-h-0 flex-1 flex-col overflow-hidden";

/**
 * New jobs / Tracked jobs: on mobile the whole card scrolls (header can move away).
 * From `md` up, keep a locked viewport with the list/board scrolling inside.
 */
export const DASHBOARD_JOBS_PAGE_CLASSNAME =
  "flex w-full min-w-0 flex-col md:h-[calc(100dvh-var(--navbar-height)-10px)] md:min-h-0 md:flex-1 md:overflow-hidden";
