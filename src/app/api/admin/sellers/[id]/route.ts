import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logAdminAction } from "@/lib/server/audit-log";
import {
  deleteSellerAsync,
  getSellerByIdAsync,
  getSellerOrders,
  getSellerProducts,
  toPublicSeller,
  updateSellerAsync,
} from "@/lib/server/sellers";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  shopName: z.string().min(2).max(120).optional(),
  ownerName: z.string().min(2).max(120).optional(),
  phone: z.string().min(10).max(20).optional(),
  password: z.string().min(6).max(128).optional(),
  city: z.string().max(80).optional(),
  status: z.enum(["pending", "active", "suspended", "rejected"]).optional(),
  notes: z.string().max(2000).nullable().optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
  reviewNote: z.string().max(2000).nullable().optional(),
});

export async function GET(request: Request, { params }: Params) {
  const __gate = await gateAdmin(request, "sellers.view");
  if (!__gate.ok) return __gate.response;

  const { id } = await params;
  const seller = await getSellerByIdAsync(id);
  if (!seller) {
    return NextResponse.json({ error: "فروشنده یافت نشد" }, { status: 404 });
  }

  const [products, orders] = await Promise.all([
    getSellerProducts(id),
    getSellerOrders(id),
  ]);

  return NextResponse.json({
    seller: toPublicSeller(seller),
    products,
    orders: orders.slice(0, 50),
    stats: {
      productCount: products.length,
      pendingProductCount: products.filter((p) => p.approvalStatus === "pending")
        .length,
      orderCount: orders.length,
      revenue: orders
        .filter((o) => o.status !== "cancelled")
        .reduce((sum, o) => sum + o.sellerSubtotal, 0),
    },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const __gate = await gateAdmin(request, "sellers.manage");
  if (!__gate.ok) return __gate.response;

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const seller = await updateSellerAsync(id, parsed.data);
    if (!seller) {
      return NextResponse.json({ error: "فروشنده یافت نشد" }, { status: 404 });
    }

    await logAdminAction({
      action: "seller.update",
      entityType: "seller",
      entityId: id,
      payload: {
        ...parsed.data,
        password: parsed.data.password ? "[redacted]" : undefined,
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

export async function DELETE(request: Request, { params }: Params) {
  const __gate = await gateAdmin(request, "sellers.manage");
  if (!__gate.ok) return __gate.response;

  const { id } = await params;

  try {
    const ok = await deleteSellerAsync(id);
    if (!ok) {
      return NextResponse.json({ error: "فروشنده یافت نشد" }, { status: 404 });
    }

    await logAdminAction({
      action: "seller.delete",
      entityType: "seller",
      entityId: id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
