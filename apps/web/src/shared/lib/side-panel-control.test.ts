import { describe, expect, it } from "vitest";

import {
  dismissDashboardSidePanel,
  expandDashboardSidePanel,
  subscribeSidePanelClose,
  subscribeSidePanelExpand
} from "./side-panel-control";

describe("side-panel-control", () => {
  it("dismiss notifies close listeners and expand notifies expand listeners", () => {
    const closed: string[] = [];
    const expanded: string[] = [];
    const offClose = subscribeSidePanelClose(() => closed.push("c"));
    const offExpand = subscribeSidePanelExpand(() => expanded.push("e"));
    dismissDashboardSidePanel();
    expandDashboardSidePanel();
    expect(closed).toEqual(["c"]);
    expect(expanded).toEqual(["e"]);
    offClose();
    offExpand();
    dismissDashboardSidePanel();
    expandDashboardSidePanel();
    expect(closed).toEqual(["c"]);
    expect(expanded).toEqual(["e"]);
  });
});
