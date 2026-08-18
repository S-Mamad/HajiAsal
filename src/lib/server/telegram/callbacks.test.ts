import { describe, expect, it } from "vitest";
import {
  parseTelegramCallbackData,
  serializeOrderCallback,
} from "./callbacks";

describe("telegram callbacks", () => {
  it("parses cancel and processing payloads", () => {
    expect(parseTelegramCallbackData("cancel:HA-1")).toEqual({
      ok: true,
      data: { action: "cancel", orderId: "HA-1" },
    });
    expect(parseTelegramCallbackData("processing:HA-99")).toEqual({
      ok: true,
      data: { action: "processing", orderId: "HA-99" },
    });
  });

  it("rejects paid-without-gateway and junk", () => {
    expect(parseTelegramCallbackData("paid:HA-1").ok).toBe(false);
    expect(parseTelegramCallbackData("cancel:").ok).toBe(false);
    expect(parseTelegramCallbackData("nope").ok).toBe(false);
    expect(serializeOrderCallback("cancel", "HA-1")).toBe("cancel:HA-1");
  });
});
