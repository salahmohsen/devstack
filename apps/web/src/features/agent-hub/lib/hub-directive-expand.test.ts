import { describe, expect, it } from "vitest";

import { expandHubDirectiveText } from "./hub-directive-expand";

describe("expandHubDirectiveText", () => {
  it("leaves plain text alone", () => {
    expect(expandHubDirectiveText("hello")).toBe("hello");
  });

  it("expands known hub-tool mentions to insert prompts", () => {
    expect(expandHubDirectiveText(":hub-tool[Skills]{name=skills}")).toBe("show me my skills list");
  });

  it("uses the chip label when the id is unknown", () => {
    expect(expandHubDirectiveText(":hub-tool[Mystery]{name=unknown}")).toBe("Mystery");
  });

  it("expands application mentions to a braced id", () => {
    expect(expandHubDirectiveText(":application[Acme SWE]{name=app-1}")).toBe(
      "application {app-1}"
    );
  });

  it("keeps typed text around an application mention", () => {
    expect(expandHubDirectiveText("please review :application[Acme SWE]{name=app-1} thanks")).toBe(
      "please review application {app-1} thanks"
    );
  });

  it("leaves hub-tool expansion unchanged next to an application mention", () => {
    expect(
      expandHubDirectiveText(":hub-tool[Skills]{name=skills} :application[Acme SWE]{name=app-1}")
    ).toBe("show me my skills list application {app-1}");
  });
});
