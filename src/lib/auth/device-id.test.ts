import { describe, expect, it } from "vitest";
import {
  isValidDeviceId,
  parseDeviceIdFromRequest,
} from "./device-id";

describe("device-id", () => {
  it("accepts UUID v4", () => {
    expect(
      isValidDeviceId("550e8400-e29b-41d4-a716-446655440000"),
    ).toBe(true);
  });

  it("rejects garbage", () => {
    expect(isValidDeviceId("abc")).toBe(false);
    expect(isValidDeviceId("")).toBe(false);
  });

  it("parses body then header then cookie", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const fromBody = parseDeviceIdFromRequest(
      new Request("http://localhost", { method: "POST" }),
      id,
    );
    expect(fromBody).toBe(id);

    const fromHeader = parseDeviceIdFromRequest(
      new Request("http://localhost", {
        method: "POST",
        headers: { "x-device-id": id },
      }),
    );
    expect(fromHeader).toBe(id);

    const fromCookie = parseDeviceIdFromRequest(
      new Request("http://localhost", {
        method: "POST",
        headers: { cookie: `hajiasal_did=${id}` },
      }),
    );
    expect(fromCookie).toBe(id);

    expect(
      parseDeviceIdFromRequest(new Request("http://localhost", { method: "POST" })),
    ).toBe("unknown");
  });
});
