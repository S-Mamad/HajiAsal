import { afterEach, describe, expect, it } from "vitest";
import {
  __resetPanelHandoffForTests,
  consumePanelHandoffRequest,
  createPanelHandoffTicket,
  parsePanelHandoffTicket,
  panelHandoffConsumeUrl,
  resolvePanelHandoffTarget,
  safeHandoffNext,
} from "@/lib/auth/panel-handoff";

describe("panel handoff tickets", () => {
  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_ADMIN_URL;
    delete process.env.NEXT_PUBLIC_SELLER_URL;
    __resetPanelHandoffForTests();
  });

  it("round-trips a valid ticket", () => {
    const ticket = createPanelHandoffTicket({
      userId: "u1",
      phone: "09120000000",
      fullName: "Ali",
      aud: "admin",
      next: "/admin/dashboard",
    });
    const parsed = parsePanelHandoffTicket(ticket);
    expect(parsed?.userId).toBe("u1");
    expect(parsed?.aud).toBe("admin");
    expect(parsed?.next).toBe("/admin/dashboard");
    expect(parsed?.jti).toMatch(/^[a-f0-9]{32}$/);
  });

  it("rejects a tampered ticket", () => {
    const ticket = createPanelHandoffTicket({
      userId: "u1",
      phone: "09120000000",
      fullName: "Ali",
      aud: "seller",
      next: "/seller/orders",
    });
    expect(parsePanelHandoffTicket(`${ticket}x`)).toBeNull();
  });

  it("rejects an expired ticket", () => {
    const ticket = createPanelHandoffTicket({
      userId: "u1",
      phone: "09120000000",
      fullName: "Ali",
      aud: "admin",
      next: "/admin/dashboard",
      now: Date.now() - 120_000,
    });
    expect(parsePanelHandoffTicket(ticket)).toBeNull();
  });

  it("safeHandoffNext blocks cross-panel paths", () => {
    expect(safeHandoffNext("/seller/dashboard", "admin")).toBe(
      "/admin/dashboard",
    );
    expect(safeHandoffNext("https://evil.com/hack", "admin")).toBe(
      "/admin/dashboard",
    );
    expect(safeHandoffNext("/admin/orders/1", "admin")).toBe("/admin/orders/1");
  });

  it("resolvePanelHandoffTarget maps allowlisted origins", () => {
    process.env.NEXT_PUBLIC_ADMIN_URL = "https://admin.hajiasal.ir";
    process.env.NEXT_PUBLIC_SELLER_URL = "https://seller.hajiasal.ir";
    expect(
      resolvePanelHandoffTarget(
        "https://admin.hajiasal.ir/admin/dashboard",
      ),
    ).toEqual({
      aud: "admin",
      origin: "https://admin.hajiasal.ir",
      next: "/admin/dashboard",
    });
    expect(
      resolvePanelHandoffTarget("https://seller.hajiasal.ir/seller/products")
        ?.aud,
    ).toBe("seller");
    expect(resolvePanelHandoffTarget("https://evil.com/admin")).toBeNull();
  });

  it("builds consume URL on the panel host", () => {
    const url = panelHandoffConsumeUrl(
      "https://admin.hajiasal.ir",
      "admin",
      "abc.def",
    );
    expect(url.startsWith("https://admin.hajiasal.ir/api/admin/auth/handoff")).toBe(
      true,
    );
    expect(url).toContain("ticket=abc.def");
  });

  it("invalid ticket redirects to same-origin login with stay=1", async () => {
    const res = await consumePanelHandoffRequest(
      new Request("https://admin.hajiasal.ir/api/admin/auth/handoff?ticket=nope"),
      "admin",
    );
    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const loc = res.headers.get("location") ?? "";
    expect(loc).toContain("https://admin.hajiasal.ir/login");
    expect(loc).toContain("stay=1");
  });

  it("valid admin ticket sets session cookie and lands on panel", async () => {
    const ticket = createPanelHandoffTicket({
      userId: "u1",
      phone: "09120000000",
      fullName: "Ali",
      aud: "admin",
      next: "/admin/dashboard",
    });
    const res = await consumePanelHandoffRequest(
      new Request(
        `https://admin.hajiasal.ir/api/admin/auth/handoff?ticket=${encodeURIComponent(ticket)}`,
      ),
      "admin",
    );
    expect(res.headers.get("location")).toBe(
      "https://admin.hajiasal.ir/admin/dashboard",
    );
    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("hajiasal_customer_session=");
  });

  it("rejects a replayed ticket", async () => {
    const ticket = createPanelHandoffTicket({
      userId: "u1",
      phone: "09120000000",
      fullName: "Ali",
      aud: "admin",
      next: "/admin/dashboard",
    });
    const req = () =>
      new Request(
        `https://admin.hajiasal.ir/api/admin/auth/handoff?ticket=${encodeURIComponent(ticket)}`,
      );
    const first = await consumePanelHandoffRequest(req(), "admin");
    expect(first.headers.get("location")).toContain("/admin/dashboard");
    const second = await consumePanelHandoffRequest(req(), "admin");
    expect(second.headers.get("location")).toContain("/login");
  });
});
