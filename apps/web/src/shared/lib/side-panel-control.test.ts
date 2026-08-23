import { describe, expect, it } from "vitest";

import {
  dismissDashboardSidePanel,
  expandDashboardSidePanel,
  registerSidePanelDismissGuard,
  subscribeSidePanelClose,
  subscribeSidePanelExpand
} from "./side-panel-control";

describe("side-panel-control", () => {
  it("dismiss notifies close listeners and expand notifies expand listeners", () => {
    const closed: string[] = [];
    const expanded: string[] = [];
    const offClose = subscribeSidePanelClose(() => closed.push("c"));
    const offExpand = subscribeSidePanelExpand(() => expanded.push("e"));
    expect(dismissDashboardSidePanel()).toBe(false);
    expandDashboardSidePanel();
    expect(closed).toEqual(["c"]);
    expect(expanded).toEqual(["e"]);
    offClose();
    offExpand();
    expect(dismissDashboardSidePanel()).toBe(false);
    expandDashboardSidePanel();
    expect(closed).toEqual(["c"]);
    expect(expanded).toEqual(["e"]);
  });

  it("dismiss guard consumes close and skips listeners", () => {
    const closed: string[] = [];
    const offClose = subscribeSidePanelClose(() => closed.push("c"));
    const offGuard = registerSidePanelDismissGuard(() => true);
    expect(dismissDashboardSidePanel()).toBe(true);
    expect(closed).toEqual([]);
    offGuard();
    expect(dismissDashboardSidePanel()).toBe(false);
    expect(closed).toEqual(["c"]);
    offClose();
  });

  it("force dismiss skips dirty-form guards", () => {
    const closed: string[] = [];
    const offClose = subscribeSidePanelClose(() => closed.push("c"));
    const offGuard = registerSidePanelDismissGuard(() => true);
    expect(dismissDashboardSidePanel({ force: true })).toBe(false);
    expect(closed).toEqual(["c"]);
    offGuard();
    offClose();
  });
});
