import { describe, expect, it } from "vitest";
import {
  computeMessageGroupFlags,
  deliveryStatusLabel,
  messageStackClass,
  type ChatMessage,
} from "@/components/tickets/chat-utils";

function msg(
  partial: Pick<ChatMessage, "id" | "senderType" | "createdAt"> &
    Partial<ChatMessage>,
): ChatMessage {
  return {
    body: "سلام",
    ...partial,
  };
}

describe("computeMessageGroupFlags", () => {
  const base = Date.parse("2026-08-12T12:00:00.000Z");

  it("groups consecutive same-sender messages within 2 minutes", () => {
    const messages = [
      msg({
        id: "1",
        senderType: "customer",
        createdAt: new Date(base).toISOString(),
      }),
      msg({
        id: "2",
        senderType: "customer",
        createdAt: new Date(base + 30_000).toISOString(),
      }),
      msg({
        id: "3",
        senderType: "admin",
        createdAt: new Date(base + 40_000).toISOString(),
      }),
    ];

    expect(computeMessageGroupFlags(messages, 0)).toMatchObject({
      isFirstInGroup: true,
      isLastInGroup: false,
      showSender: true,
      showMeta: false,
      stackGap: "turn",
    });
    expect(computeMessageGroupFlags(messages, 1)).toMatchObject({
      isFirstInGroup: false,
      isLastInGroup: true,
      showSender: false,
      showMeta: true,
      stackGap: "cluster",
    });
    expect(computeMessageGroupFlags(messages, 2)).toMatchObject({
      isFirstInGroup: true,
      isLastInGroup: true,
      showSender: true,
      showMeta: true,
      stackGap: "turn",
    });
  });

  it("splits group when gap exceeds threshold", () => {
    const messages = [
      msg({
        id: "1",
        senderType: "admin",
        createdAt: new Date(base).toISOString(),
      }),
      msg({
        id: "2",
        senderType: "admin",
        createdAt: new Date(base + 3 * 60_000).toISOString(),
      }),
    ];
    expect(computeMessageGroupFlags(messages, 0).isLastInGroup).toBe(true);
    expect(computeMessageGroupFlags(messages, 1).isFirstInGroup).toBe(true);
    expect(computeMessageGroupFlags(messages, 1).stackGap).toBe("group");
  });

  it("keeps internal notes in their own group from public messages", () => {
    const messages = [
      msg({
        id: "1",
        senderType: "admin",
        isInternal: true,
        createdAt: new Date(base).toISOString(),
      }),
      msg({
        id: "2",
        senderType: "admin",
        isInternal: false,
        createdAt: new Date(base + 10_000).toISOString(),
      }),
    ];
    expect(computeMessageGroupFlags(messages, 0).isLastInGroup).toBe(true);
    expect(computeMessageGroupFlags(messages, 1).isFirstInGroup).toBe(true);
  });
});

describe("messageStackClass", () => {
  it("uses WhatsApp-like gutters instead of glued bubbles", () => {
    expect(messageStackClass("cluster", { compact: true })).toBe("mt-2");
    expect(messageStackClass("group", { compact: true })).toBe("mt-3");
    expect(messageStackClass("turn", { compact: true })).toBe("mt-4");
    expect(messageStackClass("cluster", { isFirst: true })).toBe("");
  });
});

describe("deliveryStatusLabel", () => {
  it("maps delivery states to Persian labels", () => {
    expect(deliveryStatusLabel("read")).toBe("خوانده شد");
    expect(deliveryStatusLabel("delivered")).toBe("تحویل داده شد");
    expect(deliveryStatusLabel("sent")).toBe("ارسال شد");
    expect(deliveryStatusLabel(undefined)).toBe("ارسال شد");
  });
});
