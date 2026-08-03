import { vi } from "vitest";
import {
  DEFAULT_SELLER_CAPABILITIES,
  type SellerCapabilitiesMap,
  type SellerCapability,
} from "@/lib/seller/capabilities";
import { SELLER_COOKIE, type Seller } from "@/lib/server/sellers";
import type { SellerStatus } from "@/lib/server/sellers-store";

export type MakeSellerOptions = {
  id?: string;
  status?: SellerStatus;
  capabilities?: SellerCapabilitiesMap | null;
  bankSheba?: string;
  bankCard?: string;
  phone?: string;
  shopName?: string;
};

export function makeSeller(opts: MakeSellerOptions = {}): Seller {
  const now = new Date().toISOString();
  return {
    id: opts.id ?? "s1",
    shopName: opts.shopName ?? "فروشگاه تست",
    ownerName: "مالک تست",
    phone: opts.phone ?? "09121111111",
    passwordHash: "scrypt$test$test",
    city: "تهران",
    status: opts.status ?? "active",
    isDemo: true,
    commissionPercent: 10,
    joinedAt: now.slice(0, 10),
    createdAt: now,
    updatedAt: now,
    bankSheba: opts.bankSheba,
    bankCard: opts.bankCard,
    capabilities: opts.capabilities ?? undefined,
  };
}

/**
 * Mock getSellerFromRequest for API handler tests.
 * Call after vi.mock("@/lib/server/sellers", ...).
 */
export function installGetSellerFromRequestMock(
  getSellerFromRequest: ReturnType<typeof vi.fn>,
) {
  return {
    asUnauthenticated() {
      getSellerFromRequest.mockResolvedValue(null);
    },
    asInactive(overrides: MakeSellerOptions = {}) {
      getSellerFromRequest.mockResolvedValue(
        makeSeller({ ...overrides, status: "suspended" }),
      );
    },
    asSeller(overrides: MakeSellerOptions = {}) {
      getSellerFromRequest.mockResolvedValue(makeSeller(overrides));
    },
    /** Active seller with one capability forced off (others keep defaults). */
    asSellerWithout(capability: SellerCapability, overrides: MakeSellerOptions = {}) {
      getSellerFromRequest.mockResolvedValue(
        makeSeller({
          ...overrides,
          capabilities: {
            ...DEFAULT_SELLER_CAPABILITIES,
            ...(overrides.capabilities ?? {}),
            [capability]: false,
          },
        }),
      );
    },
  };
}

export function sellerRequest(
  url: string,
  init?: RequestInit & { cookie?: string | null },
): Request {
  const headers = new Headers(init?.headers);
  if (init?.cookie) {
    headers.set("cookie", init.cookie);
  }
  return new Request(url, {
    ...init,
    headers,
  });
}

export function authedSellerRequest(
  url: string,
  init?: RequestInit,
): Request {
  return sellerRequest(url, {
    ...init,
    cookie: `${SELLER_COOKIE}=test-token-abcdefghijklmnopqrstuvwxyz`,
  });
}

export async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}
