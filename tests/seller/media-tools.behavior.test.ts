import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    getSellerProducts: vi.fn(async () => []),
  };
});

vi.mock("@/lib/server/products-store", () => ({
  createProductAsync: vi.fn(async (p: unknown) => p),
}));

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  toIso: (v: unknown) => String(v),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET, POST, DELETE } from "@/app/api/seller/media/route";
import {
  GET as GET_TOOLS,
  POST as POST_TOOLS,
} from "@/app/api/seller/tools/route";
import { getSellerFromRequest } from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

describe("seller media behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s-media-a" });
  });

  it("POST rejects disallowed MIME", async () => {
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "doc.pdf",
          mimeType: "application/pdf",
          sizeBytes: 100,
          url: "/uploads/seller/x.pdf",
        }),
      }),
    );
    expect(res.status).toBe(400);
    const json = await readJson(res);
    expect(String(json.error)).toMatch(/JPEG|PNG|تصویر/);
  });

  it("POST accepts jpeg meta and GET lists for owner", async () => {
    const createRes = await POST(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "photo.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 1234,
          url: "/uploads/seller/s-media-a/photo.jpg",
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = await readJson(createRes);
    const fileId = (created.file as { id: string }).id;

    const listRes = await GET(
      authedSellerRequest("http://localhost/api/seller/media"),
    );
    expect(listRes.status).toBe(200);
    const list = await readJson(listRes);
    const files = list.files as Array<{ id: string }>;
    expect(files.some((f) => f.id === fileId)).toBe(true);

    sellerMock.asSeller({ id: "s-media-b" });
    const otherList = await GET(
      authedSellerRequest("http://localhost/api/seller/media"),
    );
    const otherFiles = (await readJson(otherList)).files as Array<{ id: string }>;
    expect(otherFiles.some((f) => f.id === fileId)).toBe(false);

    // switch back and delete
    sellerMock.asSeller({ id: "s-media-a" });
    const delRes = await DELETE(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId }),
      }),
    );
    expect(delRes.status).toBe(200);
  });

  it("DELETE by other seller returns 404", async () => {
    const createRes = await POST(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "own.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          url: "/uploads/seller/s-media-a/own.jpg",
        }),
      }),
    );
    const fileId = ((await readJson(createRes)).file as { id: string }).id;

    sellerMock.asSeller({ id: "s-media-b" });
    const delRes = await DELETE(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: fileId }),
      }),
    );
    expect(delRes.status).toBe(404);
  });

  it("denied without media.manage and products.manage", async () => {
    sellerMock.asSellerWithout(["media.manage", "products.manage"]);
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/media"),
    );
    expect(res.status).toBe(403);
  });

  it("allows upload with products.manage only", async () => {
    sellerMock.asSellerWithout("media.manage");
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "via-products.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          url: "/uploads/seller/s-media-a/via-products.jpg",
        }),
      }),
    );
    expect(res.status).toBe(200);
  });
});

describe("seller tools behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
  });

  it("GET template returns csv", async () => {
    const res = await GET_TOOLS(
      authedSellerRequest("http://localhost/api/seller/tools?mode=template"),
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("title,category");
  });

  it("POST import denied without tools.import_export", async () => {
    sellerMock.asSellerWithout("tools.import_export");
    const res = await POST_TOOLS(
      authedSellerRequest("http://localhost/api/seller/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: [{ title: "عسل", category: "honey", price: 100000 }],
        }),
      }),
    );
    expect(res.status).toBe(403);
  });

  it("POST import with empty rows returns 400", async () => {
    const res = await POST_TOOLS(
      authedSellerRequest("http://localhost/api/seller/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: [] }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("POST CSV multipart imports rows", async () => {
    const csv =
      "title,category,price,grams,weightLabel,shortDescription,inStock\nعسل CSV,specialty,450000,1000,۱ کیلو,توضیح,1\n";
    const form = new FormData();
    form.append(
      "file",
      new File([csv], "products.csv", { type: "text/csv" }),
    );
    form.append("submitForReview", "false");
    const res = await POST_TOOLS(
      authedSellerRequest("http://localhost/api/seller/tools", {
        method: "POST",
        body: form,
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.created).toBe(1);
  });
});
