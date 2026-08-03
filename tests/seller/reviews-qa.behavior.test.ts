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
    getSellerProducts: vi.fn(async () => [
      { id: "p1", sellerId: "s1", title: "عسل" },
    ]),
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

import { GET as GET_REVIEWS, PATCH as PATCH_REVIEWS } from "@/app/api/seller/reviews/route";
import { GET as GET_QA, PATCH as PATCH_QA } from "@/app/api/seller/qa/route";
import { getSellerFromRequest } from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

describe("seller reviews / qa behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s1" });
  });

  it("reviews GET without MySQL returns 503 after gate", async () => {
    const res = await GET_REVIEWS(
      authedSellerRequest("http://localhost/api/seller/reviews"),
    );
    expect(res.status).toBe(503);
  });

  it("reviews denied without reviews.reply", async () => {
    sellerMock.asSellerWithout("reviews.reply");
    const res = await GET_REVIEWS(
      authedSellerRequest("http://localhost/api/seller/reviews"),
    );
    expect(res.status).toBe(403);
  });

  it("reviews PATCH invalid body returns 400", async () => {
    const res = await PATCH_REVIEWS(
      authedSellerRequest("http://localhost/api/seller/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("reviews PATCH without MySQL returns 503", async () => {
    const res = await PATCH_REVIEWS(
      authedSellerRequest("http://localhost/api/seller/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewId: "r1", reply: "ممنون" }),
      }),
    );
    expect(res.status).toBe(503);
  });

  it("qa GET without MySQL returns 503 after gate", async () => {
    const res = await GET_QA(
      authedSellerRequest("http://localhost/api/seller/qa"),
    );
    expect(res.status).toBe(503);
  });

  it("qa denied without qa.reply", async () => {
    sellerMock.asSellerWithout("qa.reply");
    const res = await GET_QA(
      authedSellerRequest("http://localhost/api/seller/qa"),
    );
    expect(res.status).toBe(403);
  });

  it("qa PATCH without MySQL returns 503", async () => {
    const res = await PATCH_QA(
      authedSellerRequest("http://localhost/api/seller/qa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: "q1", answer: "بله" }),
      }),
    );
    expect(res.status).toBe(503);
  });
});
