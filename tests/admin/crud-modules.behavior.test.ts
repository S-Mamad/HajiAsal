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

vi.mock("@/lib/server/admin-platform-store", () => ({
  listBrands: vi.fn(async () => []),
  upsertBrand: vi.fn(async (d: Record<string, unknown>) => ({
    id: "b1",
    ...d,
  })),
  deleteBrand: vi.fn(async () => true),
  listArticles: vi.fn(async () => []),
  upsertArticle: vi.fn(async (d: Record<string, unknown>) => ({
    id: "a1",
    ...d,
  })),
  deleteArticle: vi.fn(async () => true),
  listCmsPages: vi.fn(async () => []),
  upsertCmsPage: vi.fn(async (d: Record<string, unknown>) => ({
    id: "p1",
    ...d,
  })),
  deleteCmsPage: vi.fn(async () => true),
  listBanners: vi.fn(async () => []),
  upsertBanner: vi.fn(async (d: Record<string, unknown>) => ({
    id: "bn1",
    ...d,
  })),
  deleteBanner: vi.fn(async () => true),
  listMedia: vi.fn(async () => []),
  createMedia: vi.fn(async (d: Record<string, unknown>) => ({
    id: "m1",
    ...d,
  })),
  deleteMedia: vi.fn(async () => true),
  listTickets: vi.fn(async () => []),
  upsertTicket: vi.fn(async (d: Record<string, unknown>) => ({
    id: "t1",
    ...d,
  })),
  listQuestions: vi.fn(async () => []),
  updateQuestion: vi.fn(async (id: string, d: Record<string, unknown>) => ({
    id,
    ...d,
  })),
}));

vi.mock("@/lib/server/categories", () => ({
  getAllCategoriesAsync: vi.fn(async () => []),
  upsertCategoryAsync: vi.fn(async (d: Record<string, unknown>) => ({
    id: "c1",
    ...d,
  })),
  deleteCategoryAsync: vi.fn(async () => true),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { POST as postBrands } from "@/app/api/admin/brands/route";
import { POST as postCategories } from "@/app/api/admin/categories/route";
import { POST as postArticles } from "@/app/api/admin/articles/route";
import { POST as postPages } from "@/app/api/admin/pages/route";
import { POST as postBanners } from "@/app/api/admin/banners/route";
import { POST as postMedia } from "@/app/api/admin/media/route";
import { POST as postTickets } from "@/app/api/admin/tickets/route";
import { PATCH as patchQa } from "@/app/api/admin/qa/route";
import { GET as getBrands } from "@/app/api/admin/brands/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

function jsonReq(url: string, method: string, body: unknown) {
  return authedAdminRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("admin CRUD modules behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("brands GET gated for warehouse (view ok)", async () => {
    authMock.asRole("warehouse");
    const res = await getBrands(
      authedAdminRequest("http://localhost/api/admin/brands"),
    );
    expect(res.status).toBe(200);
  });

  it("brands POST returns 400 on bad body", async () => {
    authMock.asRole("super_admin");
    const res = await postBrands(
      jsonReq("http://localhost/api/admin/brands", "POST", { name: "" }),
    );
    expect(res.status).toBe(400);
  });

  it("brands POST succeeds with valid body", async () => {
    authMock.asRole("content");
    const res = await postBrands(
      jsonReq("http://localhost/api/admin/brands", "POST", {
        name: "Brand",
        slug: "brand",
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.item).toBeTruthy();
  });

  it("categories POST returns 400 without id", async () => {
    authMock.asRole("content");
    const res = await postCategories(
      jsonReq("http://localhost/api/admin/categories", "POST", {
        name: "x",
        slug: "x",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("articles POST returns 400 on empty title", async () => {
    authMock.asRole("content");
    const res = await postArticles(
      jsonReq("http://localhost/api/admin/articles", "POST", {
        title: "",
        slug: "a",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("pages POST succeeds for content role", async () => {
    authMock.asRole("content");
    const res = await postPages(
      jsonReq("http://localhost/api/admin/pages", "POST", {
        title: "About",
        slug: "about",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("banners POST returns 400 without imageUrl", async () => {
    authMock.asRole("content");
    const res = await postBanners(
      jsonReq("http://localhost/api/admin/banners", "POST", { title: "B" }),
    );
    expect(res.status).toBe(400);
  });

  it("media POST returns 400 on incomplete body", async () => {
    authMock.asRole("content");
    const res = await postMedia(
      jsonReq("http://localhost/api/admin/media", "POST", { filename: "x" }),
    );
    expect(res.status).toBe(400);
  });

  it("tickets POST returns 400 without subject", async () => {
    authMock.asRole("support");
    const res = await postTickets(
      jsonReq("http://localhost/api/admin/tickets", "POST", {}),
    );
    expect(res.status).toBe(400);
  });

  it("tickets POST succeeds for support", async () => {
    authMock.asRole("support");
    const res = await postTickets(
      jsonReq("http://localhost/api/admin/tickets", "POST", {
        subject: "Help",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("warehouse cannot manage tickets", async () => {
    authMock.asRole("warehouse");
    const res = await postTickets(
      jsonReq("http://localhost/api/admin/tickets", "POST", {
        subject: "Help",
      }),
    );
    expect(res.status).toBe(403);
  });

  it("qa PATCH returns 400 without id", async () => {
    authMock.asRole("support");
    const res = await patchQa(
      jsonReq("http://localhost/api/admin/qa", "PATCH", { answer: "a" }),
    );
    expect(res.status).toBe(400);
  });

  it("qa PATCH succeeds with id", async () => {
    authMock.asRole("support");
    const res = await patchQa(
      jsonReq("http://localhost/api/admin/qa", "PATCH", {
        id: "q1",
        answer: "yes",
      }),
    );
    expect(res.status).toBe(200);
  });

  it("support cannot manage brands", async () => {
    authMock.asRole("support");
    const res = await postBrands(
      jsonReq("http://localhost/api/admin/brands", "POST", {
        name: "B",
        slug: "b",
      }),
    );
    expect(res.status).toBe(403);
  });
});
