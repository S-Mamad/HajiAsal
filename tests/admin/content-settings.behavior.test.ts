import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installRequireAdminPermissionMock,
  authedAdminRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    requireAdminPermission: vi.fn(),
  };
});

vi.mock("@/lib/server/site-settings", () => ({
  getSiteSettings: vi.fn(async () => ({
    shippingCost: 50000,
    hero: { title: "H" },
  })),
  updateSiteSettings: vi.fn(async (patch: Record<string, unknown>) => ({
    shippingCost: 50000,
    hero: { title: "H" },
    ...patch,
  })),
  resolveFaq: (settings: { faq?: unknown }) =>
    Array.isArray(settings.faq) ? settings.faq : [],
  getFaqItems: vi.fn(async () => []),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  mysqlQuery: vi.fn(),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { updateSiteSettings } from "@/lib/server/site-settings";
import { PATCH as patchContent } from "@/app/api/admin/content/route";
import { PATCH as patchSettings } from "@/app/api/admin/settings/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("content vs settings allowlist", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("content PATCH rejects shippingCost (strict allowlist)", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: 1000 }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(String(json.error)).toMatch(/محتوا/);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("content PATCH accepts footer address", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          footer: { address: "یزد، انبار مرکزی" },
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith({
      footer: { address: "یزد، انبار مرکزی" },
    });
  });

  it("content PATCH accepts hero fields", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero: { title: "New" } }),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith({
      hero: { title: "New" },
    });
  });

  it("content PATCH rejects javascript social URLs", async () => {
    authMock.asRole("content");
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          social: { telegram: "javascript:alert(1)" },
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(updateSiteSettings).not.toHaveBeenCalled();
  });

  it("settings PATCH accepts express and pickup shipping fields", async () => {
    authMock.asRole("super_admin");
    const payload = {
      shippingCost: 40000,
      expressShippingCost: 75000,
      pickupShippingCost: 0,
      freeShippingIncludesExpress: false,
      shippingMethods: {
        express: { label: "پیک ویژه", eta: "همان روز" },
      },
    };
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith(payload);
  });

  it("content role cannot PATCH settings", async () => {
    authMock.asRole("content");
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: 1 }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("settings PATCH rejects negative shippingCost", async () => {
    authMock.asRole("super_admin");
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shippingCost: -1 }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("settings PATCH accepts support widget copy", async () => {
    authMock.asRole("super_admin");
    const payload = {
      supportWidgetCopy: {
        statusQueue: "در صف پاسخ",
        welcomeLineQueue: "پیام شما ثبت شد",
      },
    };
    const res = await patchSettings(
      authedAdminRequest("http://localhost/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalledWith(payload);
  });

  it("content PATCH accepts pageCopy", async () => {
    authMock.asRole("content");
    const payload = {
      pageCopy: {
        cart: { title: "سبد من" },
        footer: { bottomTagline: "ارسال سریع" },
      },
    };
    const res = await patchContent(
      authedAdminRequest("http://localhost/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }),
    );
    expect(res.status).toBe(200);
    expect(updateSiteSettings).toHaveBeenCalled();
  });
});
