import { afterEach, describe, expect, it } from "vitest";

import {
  consumeHubCreateIntent,
  consumeOpenHubAssistant,
  getHubAssistantOpenPending,
  getHubCreateIntent,
  requestHubCreateInterview,
  requestOpenHubAssistant,
  resetHubAssistantOpenForTests
} from "./hub-assistant-open";

describe("hub assistant open + create intent", () => {
  afterEach(() => {
    resetHubAssistantOpenForTests();
  });

  it("requestHubCreateInterview sets kind and pendingOpen", () => {
    requestHubCreateInterview("project");
    expect(getHubCreateIntent()).toBe("project");
    expect(getHubAssistantOpenPending()).toBe(true);
  });

  it("sending path does not consume the open flag", () => {
    requestHubCreateInterview("experience");
    expect(consumeHubCreateIntent()).toBe("experience");
    expect(getHubCreateIntent()).toBeNull();
    expect(getHubAssistantOpenPending()).toBe(true);
    expect(consumeOpenHubAssistant()).toBe(true);
    expect(getHubAssistantOpenPending()).toBe(false);
  });

  it("requestOpenHubAssistant does not set a create kind", () => {
    requestOpenHubAssistant();
    expect(getHubCreateIntent()).toBeNull();
    expect(getHubAssistantOpenPending()).toBe(true);
  });
});
