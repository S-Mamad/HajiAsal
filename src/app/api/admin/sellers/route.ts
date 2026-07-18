import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction } from "@/lib/server/audit-log";
import {
  createSellerAsync,
  getAllSellersAsync,
  getSellerProducts,
  toPublicSeller,
} from "@/lib/server/sellers";

const createSchema = z.object({
  shopName: z.string().min(2).max(120),
  ownerName: z.string().min(2).max(120),
  phone: z.string().min(10).max(20),
  password: z.string().min(6).max(128),
  city: z.string().max(80).optional().default(""),
  status: z
    .enum(["pending", "active", "suspended", "rejected"])
    .optional()
    .default("active"),
  notes: z.string().max(2000).optional(),
  commissionPercent: z.number().min(0).max(100).optional().default(10),
});

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "sellers.view");
  if (!__gate.ok) return __gate.response;

  const sellers = await getAllSellersAsync();
  const withStats = await Promise.all(
    sellers.map(async (seller) => {
      const products = await getSellerProducts(seller.id);
      const pendingProducts = products.filter(
        (p) => p.approvalStatus === "pending",
      ).length;
      return {
        ...toPublicSeller(seller),
        productCount: products.length,
        pendingProductCount: pendingProducts,
      };
    }),
  );

  return NextResponse.json({ sellers: withStats });
}

export async function POST(request: Request) {
  const __gate = await gateAdmin(request, "sellers.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "اطلاعات فروشنده نامعتبر است" },
        { status: 400 },
      );
    }

    const seller = await createSellerAsync(parsed.data);
    await logAdminAction({
      action: "seller.create",
      entityType: "seller",
      entityId: seller.id,
      payload: {
        shopName: seller.shopName,
        phone: seller.phone,
        status: seller.status,
      },
    });

    return NextResponse.json({
      success: true,
      seller: toPublicSeller(seller),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    const status = message.includes("قبلاً") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
