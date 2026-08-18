/** Default / clamp for the xl+ dashboard (and public repos-list) inspect panel. */
export const DASHBOARD_SIDE_PANEL_WIDTH = 560;
export const DASHBOARD_SIDE_PANEL_MIN_WIDTH = 360;
export const DASHBOARD_SIDE_PANEL_MAX_WIDTH = 720;

const STORAGE_KEY = "dashboard:side-panel-width";

export function clampDashboardSidePanelWidth(px: number): number {
  return Math.min(
    DASHBOARD_SIDE_PANEL_MAX_WIDTH,
    Math.max(DASHBOARD_SIDE_PANEL_MIN_WIDTH, Math.round(px))
  );
}

export function readStoredDashboardSidePanelWidth(): number {
  if (typeof window === "undefined") return DASHBOARD_SIDE_PANEL_WIDTH;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  const n = raw == null ? Number.NaN : Number(raw);
  if (!Number.isFinite(n)) return DASHBOARD_SIDE_PANEL_WIDTH;
  return clampDashboardSidePanelWidth(n);
}

export function writeStoredDashboardSidePanelWidth(px: number): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, String(clampDashboardSidePanelWidth(px)));
}
