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
  };
});

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  toIso: (v: unknown) => String(v),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET, POST, DELETE } from "@/app/api/seller/discounts/route";
import { getSellerFromRequest } from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

describe("seller discounts behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("default seller without discounts.manage gets 403", async () => {
    sellerMock.asSeller(); // defaults: discounts.manage false
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/discounts"),
    );
    expect(res.status).toBe(403);
  });

  it("with capability but without MySQL returns 503", async () => {
    sellerMock.asSeller({
      capabilities: { "discounts.manage": true },
    });
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/discounts"),
    );
    expect(res.status).toBe(503);
    const json = await readJson(res);
    expect(String(json.error)).toMatch(/دیتابیس|در دسترس/);
  });

  it("POST with capability without MySQL returns 503", async () => {
    sellerMock.asSeller({
      capabilities: { "discounts.manage": true },
    });
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/discounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: "OFF10",
          type: "percent",
          value: 10,
        }),
      }),
    );
    expect(res.status).toBe(503);
  });

  it("DELETE without capability returns 403", async () => {
    sellerMock.asSeller();
    const res = await DELETE(
      authedSellerRequest("http://localhost/api/seller/discounts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: "d1" }),
      }),
    );
    expect(res.status).toBe(403);
  });
});
