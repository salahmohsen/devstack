import { afterEach, describe, expect, it } from "vitest";

import { APPLICATION_MENTION_RE } from "@tsu-stack/core";

import {
  consumeHubApplicationPlant,
  consumeHubCreateIntent,
  consumeOpenHubAssistant,
  getHubApplicationPlant,
  getHubAssistantOpenPending,
  getHubCreateIntent,
  getHubInterviewRehearsal,
  hubInterviewRehearsalText,
  requestHubApplicationMention,
  requestHubCreateInterview,
  requestHubInterviewRehearsal,
  requestOpenHubAssistant,
  resetHubAssistantOpenForTests,
  snapshotHubApplicationPlant
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

describe("hub application plant + interview rehearsal", () => {
  afterEach(() => {
    resetHubAssistantOpenForTests();
  });

  it("hubInterviewRehearsalText matches APPLICATION_MENTION_RE", () => {
    const text = hubInterviewRehearsalText({
      applicationId: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    expect(text).toMatch(APPLICATION_MENTION_RE);
    expect(text.match(APPLICATION_MENTION_RE)?.[1]).toBe("app-1");
  });

  it("live requestHubInterviewRehearsal template matches APPLICATION_MENTION_RE", () => {
    requestHubInterviewRehearsal({
      applicationId: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    const text = getHubInterviewRehearsal();
    expect(text).toMatch(APPLICATION_MENTION_RE);
    expect(text).toContain("application {app-1}");
  });

  it("requestHubApplicationMention sets pendingOpen and plant seed without interview text", () => {
    requestHubApplicationMention({
      id: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    expect(getHubAssistantOpenPending()).toBe(true);
    expect(getHubInterviewRehearsal()).toBeNull();
    const plant = getHubApplicationPlant();
    expect(plant?.directive).toBe(":application[Acme · SWE]{name=app-1}");
    expect(plant?.extraTypedText).toBe("");
    expect(plant?.needsNewChat).toBe(true);
  });

  it("consumeHubApplicationPlant clears the seed after send", () => {
    requestHubApplicationMention({
      id: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    expect(consumeHubApplicationPlant()?.directive).toContain("name=app-1");
    expect(getHubApplicationPlant()).toBeNull();
  });

  it("snapshotHubApplicationPlant keeps the seed until consume", () => {
    requestHubApplicationMention({
      id: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    snapshotHubApplicationPlant(" follow up");
    expect(getHubApplicationPlant()?.extraTypedText).toBe(" follow up");
    expect(getHubApplicationPlant()?.directive).toContain("app-1");
  });

  it("resetHubAssistantOpenForTests clears plant", () => {
    requestHubApplicationMention({
      id: "app-1",
      title: "SWE",
      companyName: "Acme"
    });
    resetHubAssistantOpenForTests();
    expect(getHubApplicationPlant()).toBeNull();
    expect(getHubAssistantOpenPending()).toBe(false);
  });
});
