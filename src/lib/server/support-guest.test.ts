import { describe, expect, it } from "vitest";
import {
  createSupportGuestToken,
  newGuestCustomerId,
  parseSupportGuestToken,
  resolveSupportActor,
  SUPPORT_GUEST_COOKIE,
} from "./support-guest";

describe("support guest identity", () => {
  it("creates a verifiable guest token", () => {
    const token = createSupportGuestToken({
      fullName: "علی رضایی",
      phone: "09121234567",
    });
    const parsed = parseSupportGuestToken(token);
    expect(parsed?.fullName).toBe("علی رضایی");
    expect(parsed?.phone).toBe("09121234567");
    expect(parsed?.guestId).toMatch(/^guest-[a-f0-9]{32}$/);
    expect(parsed?.guestId).not.toBe("guest-09121234567");
  });

  it("normalizes phone and collapses name spaces", () => {
    const token = createSupportGuestToken({
      fullName: "  سارا   محمدی  ",
      phone: "+989121111111",
    });
    const parsed = parseSupportGuestToken(token);
    expect(parsed?.fullName).toBe("سارا محمدی");
    expect(parsed?.phone).toBe("09121111111");
  });

  it("rejects invalid phone / short name", () => {
    expect(() =>
      createSupportGuestToken({ fullName: "ع", phone: "09121234567" }),
    ).toThrow("INVALID_NAME");
    expect(() =>
      createSupportGuestToken({ fullName: "علی", phone: "123" }),
    ).toThrow("INVALID_PHONE");
  });

  it("rejects tampered tokens", () => {
    const token = createSupportGuestToken({
      fullName: "سارا",
      phone: "09120000000",
    });
    expect(parseSupportGuestToken(`${token}x`)).toBeNull();
    expect(parseSupportGuestToken("not.a.token")).toBeNull();
  });

  it("prefers logged-in session over guest cookie", () => {
    const token = createSupportGuestToken({
      fullName: "مهمان",
      phone: "09123334444",
    });
    const request = new Request("https://hajiasal.ir/api", {
      headers: { cookie: `${SUPPORT_GUEST_COOKIE}=${token}` },
    });
    const actor = resolveSupportActor(
      { userId: "u1", phone: "09125556666", fullName: "کاربر" },
      request,
    );
    expect(actor?.kind).toBe("user");
    expect(actor?.customerId).toBe("u1");
    expect(actor?.fullName).toBe("کاربر");
  });

  it("resolves guest actor from cookie when no session", () => {
    const token = createSupportGuestToken({
      fullName: "مهمان تست",
      phone: "09127778888",
    });
    const request = new Request("https://hajiasal.ir/api", {
      headers: { cookie: `${SUPPORT_GUEST_COOKIE}=${encodeURIComponent(token)}` },
    });
    const actor = resolveSupportActor(null, request);
    expect(actor?.kind).toBe("guest");
    expect(actor?.customerId).toMatch(/^guest-[a-f0-9]{32}$/);
    expect(actor?.customerId).not.toBe("guest-09127778888");
    expect(actor?.fullName).toBe("مهمان تست");
  });

  it("issues a unique guestId per mint so phone is not an access key", () => {
    const a = createSupportGuestToken({
      fullName: "یک",
      phone: "09120000001",
    });
    const b = createSupportGuestToken({
      fullName: "دو",
      phone: "09120000001",
    });
    expect(parseSupportGuestToken(a)?.guestId).not.toBe(
      parseSupportGuestToken(b)?.guestId,
    );
    expect(newGuestCustomerId()).not.toBe(newGuestCustomerId());
  });

  it("returns null when neither session nor guest exist", () => {
    const request = new Request("https://hajiasal.ir/api");
    expect(resolveSupportActor(null, request)).toBeNull();
  });
});
