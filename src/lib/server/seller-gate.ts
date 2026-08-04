import { NextResponse } from "next/server";
import {
  getSellerFromRequest,
  type Seller,
} from "@/lib/server/sellers";
import {
  canSeller,
  type SellerCapability,
} from "@/lib/seller/capabilities";

export type SellerAuthContext = {
  seller: Seller;
};

async function gateSellerBase(
  request: Request,
): Promise<
  | { ok: true; ctx: SellerAuthContext }
  | { ok: false; response: NextResponse }
> {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "دسترسی غیرمجاز", success: false },
        { status: 401 },
      ),
    };
  }

  if (seller.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "حساب فروشنده فعال نیست", success: false },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx: { seller } };
}

export async function gateSeller(
  request: Request,
  capability?: SellerCapability,
): Promise<
  | { ok: true; ctx: SellerAuthContext }
  | { ok: false; response: NextResponse }
> {
  const base = await gateSellerBase(request);
  if (!base.ok) return base;

  if (capability && !canSeller(base.ctx.seller.capabilities, capability)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "این قابلیت برای فروشگاه شما فعال نیست", success: false },
        { status: 403 },
      ),
    };
  }

  return base;
}

/** Accept if the seller has at least one of the listed capabilities. */
export async function gateSellerAny(
  request: Request,
  capabilities: SellerCapability[],
): Promise<
  | { ok: true; ctx: SellerAuthContext }
  | { ok: false; response: NextResponse }
> {
  const base = await gateSellerBase(request);
  if (!base.ok) return base;

  if (
    capabilities.length > 0 &&
    !capabilities.some((cap) => canSeller(base.ctx.seller.capabilities, cap))
  ) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "این قابلیت برای فروشگاه شما فعال نیست", success: false },
        { status: 403 },
      ),
    };
  }

  return base;
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
