import { type UIMessage } from "@ai-sdk/react";
import { describe, expect, it, vi } from "vitest";

import {
  createHubThreadHistoryAdapter,
  hubHistoryHasBranches,
  hubHistoryHeadPath,
  mapUiMessagesToHistoryItems,
  prependUniqueHubMessages,
  unionHubMessages
} from "./hub-thread-history-adapter";

function msg(id: string, role: "user" | "assistant" = "user"): UIMessage {
  return { id, role, parts: [{ type: "text", text: id }] } as UIMessage;
}

describe("mapUiMessagesToHistoryItems", () => {
  it("builds a sequential parentId chain", () => {
    const items = mapUiMessagesToHistoryItems([msg("a"), msg("b"), msg("c")]);
    expect(items).toEqual([
      { parentId: null, message: expect.objectContaining({ id: "a" }) },
      { parentId: "a", message: expect.objectContaining({ id: "b" }) },
      { parentId: "b", message: expect.objectContaining({ id: "c" }) }
    ]);
  });

  it("uses fmt.getId when provided", () => {
    const items = mapUiMessagesToHistoryItems([msg("a"), msg("b")], {
      getId: (message) => `fmt:${message.id}`
    });
    expect(items[1]?.parentId).toBe("fmt:a");
  });

  it("drops messages without an id", () => {
    const items = mapUiMessagesToHistoryItems([
      { id: "", role: "user", parts: [] } as UIMessage,
      msg("kept")
    ]);
    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ parentId: null, message: expect.objectContaining({ id: "kept" }) });
  });

  it("treats consecutive text-only assistant replies as siblings of the user turn", () => {
    const items = mapUiMessagesToHistoryItems([
      msg("u1"),
      msg("a1", "assistant"),
      msg("a2", "assistant"),
      msg("u2"),
      msg("a3", "assistant")
    ]);
    expect(items.map((item) => item.parentId)).toEqual([null, "u1", "u1", "a2", "u2"]);
    expect(hubHistoryHeadPath(items).map((message) => message.id)).toEqual([
      "u1",
      "a2",
      "u2",
      "a3"
    ]);
    expect(hubHistoryHasBranches(items)).toBe(true);
  });

  it("treats consecutive tool-bearing assistant turns as regenerate siblings", () => {
    const toolTurn = (id: string, text: string): UIMessage => {
      return {
        id,
        role: "assistant",
        parts: [
          {
            type: "tool-listProjects",
            toolCallId: `tc-${id}`,
            state: "output-available",
            input: {},
            output: { projects: [] }
          },
          { type: "text", text }
        ]
      };
    };
    const items = mapUiMessagesToHistoryItems([
      msg("u1"),
      toolTurn("a1", "first summary"),
      toolTurn("a2", "second summary")
    ]);
    expect(items.map((item) => item.parentId)).toEqual([null, "u1", "u1"]);
    expect(hubHistoryHeadPath(items).map((message) => message.id)).toEqual(["u1", "a2"]);
    expect(hubHistoryHasBranches(items)).toBe(true);
  });

  it("keeps a completed tool step then final text on a linear path", () => {
    const toolThenText = {
      id: "tool",
      role: "assistant",
      parts: [
        { type: "text", text: "Looking that up." },
        {
          type: "tool-getProject",
          toolCallId: "tc1",
          state: "output-available",
          input: { projectId: "p1" },
          output: { found: true }
        }
      ]
    } as UIMessage;
    const items = mapUiMessagesToHistoryItems([msg("u1"), toolThenText, msg("a1", "assistant")]);
    expect(items.map((item) => item.parentId)).toEqual([null, "u1", "tool"]);
    expect(hubHistoryHeadPath(items).map((message) => message.id)).toEqual(["u1", "tool", "a1"]);
    expect(hubHistoryHasBranches(items)).toBe(false);
  });
});

describe("prependUniqueHubMessages", () => {
  it("prepends older messages and skips duplicate ids", () => {
    const current = [msg("b"), msg("c")];
    const older = [msg("a"), msg("b")];
    expect(prependUniqueHubMessages(older, current).map((m) => m.id)).toEqual(["a", "b", "c"]);
  });
});

describe("unionHubMessages", () => {
  it("appends extras that are not already present", () => {
    expect(unionHubMessages([msg("a")], [msg("a"), msg("b")]).map((message) => message.id)).toEqual(
      ["a", "b"]
    );
  });
});

describe("createHubThreadHistoryAdapter", () => {
  it("loads page 0 through withFormat as a parentId repository", async () => {
    const loadPage = vi.fn(async (page: number) => {
      return {
        uiMessages: page === 0 ? [msg("m1"), msg("m2")] : [],
        hasMore: false
      };
    });
    const adapter = createHubThreadHistoryAdapter({ loadPage });
    expect(typeof adapter.withFormat).toBe("function");

    const formatted = adapter.withFormat!({
      format: "test",
      encode: () => {
        return {};
      },
      decode: (stored) => {
        return {
          parentId: stored.parent_id,
          message: stored.content
        };
      },
      getId: (message: UIMessage) => message.id
    });

    const repo = await formatted.load();
    expect(loadPage).toHaveBeenCalledWith(0);
    expect(repo.messages.map((item) => (item.message as UIMessage).id)).toEqual(["m1", "m2"]);
    expect(repo.messages.map((item) => item.parentId)).toEqual([null, "m1"]);
    expect(repo.headId).toBe("m2");

    await expect(formatted.append({ parentId: "m2", message: msg("m3") })).resolves.toBeUndefined();
    await expect(adapter.append({} as never)).resolves.toBeUndefined();
    await expect(adapter.load()).resolves.toEqual({ headId: null, messages: [] });
  });
});
