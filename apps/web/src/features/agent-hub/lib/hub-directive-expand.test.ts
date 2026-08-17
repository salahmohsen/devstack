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
});
