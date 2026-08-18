import { describe, expect, it } from "vitest";

import {
  clampDashboardSidePanelWidth,
  DASHBOARD_SIDE_PANEL_MAX_WIDTH,
  DASHBOARD_SIDE_PANEL_MIN_WIDTH
} from "./side-panel-width";

describe("clampDashboardSidePanelWidth", () => {
  it("clamps below min and above max", () => {
    expect(clampDashboardSidePanelWidth(100)).toBe(DASHBOARD_SIDE_PANEL_MIN_WIDTH);
    expect(clampDashboardSidePanelWidth(9999)).toBe(DASHBOARD_SIDE_PANEL_MAX_WIDTH);
  });

  it("rounds to nearest px inside the range", () => {
    expect(clampDashboardSidePanelWidth(400.4)).toBe(400);
    expect(clampDashboardSidePanelWidth(400.6)).toBe(401);
  });
});
