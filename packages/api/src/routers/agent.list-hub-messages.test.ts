import { describe, expect, it } from "vitest";

import {
  attachCreatedAtToUiMessages,
  computeHubMessagesHasMore,
  emptyHubMessagesPage,
  orderHubMessagesChronologically,
  shapeListHubMessagesPage
} from "./agent.list-hub-messages";

describe("computeHubMessagesHasMore", () => {
  it("prefers official upstream hasMore", () => {
    expect(
      computeHubMessagesHasMore({
        page: 0,
        perPage: 40,
        messageCount: 40,
        upstreamHasMore: false,
        upstreamTotal: 80
      })
    ).toBe(false);
    expect(
      computeHubMessagesHasMore({
        page: 0,
        perPage: 2,
        messageCount: 1,
        upstreamHasMore: true
      })
    ).toBe(true);
  });

  it("uses total when hasMore is absent", () => {
    expect(
      computeHubMessagesHasMore({
        page: 0,
        perPage: 40,
        messageCount: 40,
        upstreamTotal: 41
      })
    ).toBe(true);
    expect(
      computeHubMessagesHasMore({
        page: 1,
        perPage: 40,
        messageCount: 40,
        upstreamTotal: 80
      })
    ).toBe(false);
  });

  it("falls back to a full page meaning more remain", () => {
    expect(
      computeHubMessagesHasMore({
        page: 0,
        perPage: 40,
        messageCount: 40
      })
    ).toBe(true);
    expect(
      computeHubMessagesHasMore({
        page: 2,
        perPage: 40,
        messageCount: 12
      })
    ).toBe(false);
    expect(
      computeHubMessagesHasMore({
        page: 0,
        perPage: 40,
        messageCount: 0
      })
    ).toBe(false);
  });
});

describe("attachCreatedAtToUiMessages", () => {
  it("maps raw Mastra createdAt onto UIMessage metadata.createdAt ISO", () => {
    const ui = attachCreatedAtToUiMessages(
      [{ id: "m1", role: "user", parts: [] }],
      [{ id: "m1", createdAt: "2026-08-13T12:00:00.000Z" }]
    );

    expect(ui).toEqual([
      {
        id: "m1",
        role: "user",
        parts: [],
        metadata: { createdAt: "2026-08-13T12:00:00.000Z" }
      }
    ]);
  });

  it("keeps existing metadata.createdAt and copies top-level createdAt into metadata", () => {
    const kept = attachCreatedAtToUiMessages(
      [
        {
          id: "m1",
          metadata: { createdAt: "2026-01-01T00:00:00.000Z", source: "ui" }
        }
      ],
      [{ id: "m1", createdAt: "2026-08-13T12:00:00.000Z" }]
    );
    expect(kept).toEqual([
      {
        id: "m1",
        metadata: { createdAt: "2026-01-01T00:00:00.000Z", source: "ui" }
      }
    ]);

    const fromTopLevel = attachCreatedAtToUiMessages(
      [{ id: "m2", createdAt: "2026-07-01T08:30:00.000Z" }],
      []
    );
    expect(fromTopLevel).toEqual([
      {
        id: "m2",
        createdAt: "2026-07-01T08:30:00.000Z",
        metadata: { createdAt: "2026-07-01T08:30:00.000Z" }
      }
    ]);
  });

  it("returns null uiMessages unchanged", () => {
    expect(
      attachCreatedAtToUiMessages(null, [{ id: "m1", createdAt: "2026-01-01T00:00:00.000Z" }])
    ).toBe(null);
  });
});

describe("orderHubMessagesChronologically", () => {
  it("reverses newest-first pages and leaves display order alone", () => {
    const newestFirst = [
      { id: "b", createdAt: "2026-08-13T12:00:00.000Z" },
      { id: "a", createdAt: "2026-08-13T11:00:00.000Z" }
    ];
    expect(
      orderHubMessagesChronologically(newestFirst).map((m) => (m as { id: string }).id)
    ).toEqual(["a", "b"]);

    const displayOrder = [
      { id: "a", createdAt: "2026-08-13T11:00:00.000Z" },
      { id: "b", createdAt: "2026-08-13T12:00:00.000Z" }
    ];
    expect(orderHubMessagesChronologically(displayOrder)).toBe(displayOrder);
  });

  it("does not reverse when timestamps are missing", () => {
    const page = [{ id: "b" }, { id: "a" }];
    expect(orderHubMessagesChronologically(page)).toBe(page);
  });
});

describe("shapeListHubMessagesPage", () => {
  it("attaches timestamps, orders oldest→newest, and reports hasMore", () => {
    const page = shapeListHubMessagesPage({
      page: 0,
      perPage: 2,
      hasMore: true,
      messages: [
        { id: "2", createdAt: "2026-08-13T12:00:00.000Z" },
        { id: "1", createdAt: "2026-08-13T11:00:00.000Z" }
      ],
      uiMessages: [
        { id: "2", role: "assistant" },
        { id: "1", role: "user" }
      ]
    });

    expect(page.page).toBe(0);
    expect(page.hasMore).toBe(true);
    expect(page.messages.map((m) => (m as { id: string }).id)).toEqual(["1", "2"]);
    expect(page.uiMessages).toEqual([
      {
        id: "1",
        role: "user",
        metadata: { createdAt: "2026-08-13T11:00:00.000Z" }
      },
      {
        id: "2",
        role: "assistant",
        metadata: { createdAt: "2026-08-13T12:00:00.000Z" }
      }
    ]);
  });

  it("coerces missing arrays and keeps empty-page contract", () => {
    expect(
      shapeListHubMessagesPage({ page: 3, perPage: 40, messages: undefined, uiMessages: undefined })
    ).toEqual({
      messages: [],
      uiMessages: null,
      hasMore: false,
      page: 3
    });
    expect(emptyHubMessagesPage(1)).toEqual({
      messages: [],
      uiMessages: [],
      hasMore: false,
      page: 1
    });
  });

  it("converts Mastra DB messages when uiMessages is missing", () => {
    const page = shapeListHubMessagesPage({
      page: 0,
      perPage: 40,
      uiMessages: null,
      messages: [
        {
          id: "m2",
          role: "assistant",
          createdAt: "2026-08-13T12:00:00.000Z",
          content: { format: 2, parts: [{ type: "text", text: "hi" }] }
        },
        {
          id: "m1",
          role: "user",
          createdAt: "2026-08-13T11:00:00.000Z",
          content: { format: 2, parts: [{ type: "text", text: "hello" }] }
        }
      ]
    });

    expect(page.uiMessages).toEqual([
      {
        id: "m1",
        role: "user",
        parts: [{ type: "text", text: "hello" }],
        metadata: { createdAt: "2026-08-13T11:00:00.000Z" }
      },
      {
        id: "m2",
        role: "assistant",
        parts: [{ type: "text", text: "hi" }],
        metadata: { createdAt: "2026-08-13T12:00:00.000Z" }
      }
    ]);
  });

  it("maps tool-invocation parts so hydrated HITL stays renderable", () => {
    const page = shapeListHubMessagesPage({
      page: 0,
      perPage: 40,
      uiMessages: [],
      messages: [
        {
          id: "a1",
          role: "assistant",
          createdAt: "2026-08-13T12:00:00.000Z",
          content: {
            format: 2,
            parts: [
              {
                type: "tool-invocation",
                toolInvocation: {
                  toolCallId: "tc1",
                  toolName: "generate-apply-package",
                  state: "approval-requested",
                  args: { applicationId: "app-1" },
                  approval: { id: "run-1::tc1" }
                }
              }
            ]
          }
        }
      ]
    });

    expect(page.uiMessages).toEqual([
      {
        id: "a1",
        role: "assistant",
        parts: [
          {
            type: "tool-generate-apply-package",
            toolCallId: "tc1",
            toolName: "generate-apply-package",
            state: "approval-requested",
            input: { applicationId: "app-1" },
            approval: { id: "run-1::tc1" }
          }
        ],
        metadata: { createdAt: "2026-08-13T12:00:00.000Z" }
      }
    ]);
  });
});
