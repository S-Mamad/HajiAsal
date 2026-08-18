import { afterEach, describe, expect, it, vi } from "vitest";
import { ingestTelegramUpdate } from "./ingest";
import { __resetTelegramOutboxForTests } from "./outbox";
import { getAllOrders } from "../orders";

vi.mock("../orders", () => ({
  getAllOrders: vi.fn(async () => {
    throw new Error("getAllOrders must not run on webhook ingest");
  }),
  getOrderById: vi.fn(),
  updateOrderAdmin: vi.fn(),
}));

describe("telegram webhook ingest", () => {
  const env = { ...process.env };

  afterEach(() => {
    process.env = { ...env };
    __resetTelegramOutboxForTests();
  });

  it("enqueues /today without querying orders", async () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "42";
    const result = await ingestTelegramUpdate({
      message: { text: "/today", chat: { id: 42 } },
    });
    expect(result.queued).toBe(true);
    expect(result.kind).toBe("inbound");
    expect(getAllOrders).not.toHaveBeenCalled();
  });

  it("enqueues callback_query without querying orders", async () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "42";
    const result = await ingestTelegramUpdate({
      callback_query: {
        id: "cb1",
        data: "cancel:HA-1",
        message: { message_id: 9, chat: { id: 42 } },
      },
    });
    expect(result.queued).toBe(true);
    expect(result.kind).toBe("callback");
    expect(getAllOrders).not.toHaveBeenCalled();
  });

  it("ignores chats outside the whitelist", async () => {
    process.env.TELEGRAM_ADMIN_CHAT_IDS = "42";
    const result = await ingestTelegramUpdate({
      message: { text: "/today", chat: { id: 99 } },
    });
    expect(result.queued).toBe(false);
    expect(result.ignored).toBe("chat");
  });
});
