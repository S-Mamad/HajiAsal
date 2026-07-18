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

export async function gateSeller(
  request: Request,
  capability?: SellerCapability,
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

  if (capability && !canSeller(seller.capabilities, capability)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "این قابلیت برای فروشگاه شما فعال نیست", success: false },
        { status: 403 },
      ),
    };
  }

  return { ok: true, ctx: { seller } };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
