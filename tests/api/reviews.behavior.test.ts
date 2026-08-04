import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/rate-limit", () => ({
  getClientIp: () => "127.0.0.1",
  checkRateLimitAsync: vi.fn(async () => ({ ok: true, retryAfterSec: 0 })),
}));

vi.mock("@/lib/server/orders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/orders")>();
  return {
    ...actual,
    hasPurchasedByPhone: vi.fn(),
    hasPurchasedProductByPhone: vi.fn(),
  };
});

vi.mock("@/lib/server/reviews", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/reviews")>();
  return {
    ...actual,
    createReview: vi.fn(async () => ({
      id: "r1",
      productId: "p1",
      author: "خریدار",
      rating: 5,
      comment: "نظر تستی طولانی کافی",
      date: new Date().toISOString(),
      verified: false,
    })),
    getReviewsByProduct: vi.fn(async () => []),
    getFeaturedReviewsAsync: vi.fn(async () => []),
  };
});

import { POST as POST_REVIEW } from "@/app/api/reviews/route";
import { GET as GET_ELIGIBILITY } from "@/app/api/reviews/eligibility/route";
import {
  hasPurchasedByPhone,
  hasPurchasedProductByPhone,
} from "@/lib/server/orders";
import { createReview } from "@/lib/server/reviews";
import {
  createSessionToken,
  CUSTOMER_COOKIE,
} from "@/lib/auth/session";

const PHONE = "09123456789";

function sessionCookie(): string {
  const token = createSessionToken({
    userId: "u1",
    phone: PHONE,
    fullName: "تست",
  });
  return `${CUSTOMER_COOKIE}=${encodeURIComponent(token)}`;
}

function postReview(body: unknown, cookie?: string) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (cookie) headers.Cookie = cookie;
  return POST_REVIEW(
    new Request("http://localhost/api/reviews", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    }),
  );
}

function getEligibility(productId: string, cookie?: string) {
  const headers: Record<string, string> = {};
  if (cookie) headers.Cookie = cookie;
  return GET_ELIGIBILITY(
    new Request(
      `http://localhost/api/reviews/eligibility?productId=${encodeURIComponent(productId)}`,
      { headers },
    ),
  );
}

describe("reviews API purchase gates", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasPurchasedByPhone).mockResolvedValue(false);
    vi.mocked(hasPurchasedProductByPhone).mockResolvedValue(false);
  });

  it("POST without session returns 401", async () => {
    const res = await postReview({
      author: "تست",
      rating: 5,
      comment: "نظر تستی طولانی کافی",
      productId: "p1",
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("POST product review without purchase returns 403 product message", async () => {
    vi.mocked(hasPurchasedProductByPhone).mockResolvedValue(false);
    const res = await postReview(
      {
        author: "تست",
        rating: 5,
        comment: "نظر تستی طولانی کافی",
        productId: "p1",
      },
      sessionCookie(),
    );
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.message).toContain("این محصول");
    expect(hasPurchasedProductByPhone).toHaveBeenCalled();
    expect(createReview).not.toHaveBeenCalled();
  });

  it("POST product review with purchase succeeds", async () => {
    vi.mocked(hasPurchasedProductByPhone).mockResolvedValue(true);
    const res = await postReview(
      {
        author: "تست",
        rating: 5,
        comment: "نظر تستی طولانی کافی",
        productId: "p1",
      },
      sessionCookie(),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(createReview).toHaveBeenCalled();
  });

  it("eligibility without session returns login", async () => {
    const res = await getEligibility("p1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ canReview: false, reason: "login" });
  });

  it("eligibility without purchase returns purchase", async () => {
    vi.mocked(hasPurchasedProductByPhone).mockResolvedValue(false);
    const res = await getEligibility("p1", sessionCookie());
    const body = await res.json();
    expect(body).toEqual({ canReview: false, reason: "purchase" });
  });

  it("eligibility with purchase returns ok", async () => {
    vi.mocked(hasPurchasedProductByPhone).mockResolvedValue(true);
    const res = await getEligibility("p1", sessionCookie());
    const body = await res.json();
    expect(body).toEqual({ canReview: true, reason: "ok" });
  });
});
