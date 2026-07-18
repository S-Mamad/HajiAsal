import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import {
  toPublicSeller,
  updateSellerAsync,
} from "@/lib/server/sellers";
import { logSellerActivity } from "@/lib/server/seller-activity";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "profile.manage");
  if (!gated.ok) return gated.response;
  return NextResponse.json({ seller: toPublicSeller(gated.ctx.seller) });
}

const patchSchema = z.object({
  shopName: z.string().min(2).max(200).optional(),
  ownerName: z.string().min(2).max(200).optional(),
  city: z.string().max(120).optional(),
  address: z.string().max(500).nullable().optional(),
  contactPhone: z.string().max(32).nullable().optional(),
  logo: z.string().max(2000).nullable().optional(),
  banner: z.string().max(2000).nullable().optional(),
  bankName: z.string().max(120).nullable().optional(),
  bankSheba: z.string().max(34).nullable().optional(),
  bankCard: z.string().max(32).nullable().optional(),
  shopSettings: z
    .object({
      workingHours: z.string().optional(),
      prepTimeHours: z.number().optional(),
      holidays: z.array(z.string()).optional(),
      autoMessage: z.string().optional(),
      shippingNotes: z.string().optional(),
      lowStockThreshold: z.number().int().min(0).optional(),
    })
    .nullable()
    .optional(),
  notificationPrefs: z
    .object({
      emailOrders: z.boolean().optional(),
      emailLowStock: z.boolean().optional(),
      emailTickets: z.boolean().optional(),
      emailWallet: z.boolean().optional(),
    })
    .nullable()
    .optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "profile.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const updated = await updateSellerAsync(gated.ctx.seller.id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "به‌روزرسانی ناموفق" }, { status: 500 });
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "profile.update",
    entityType: "seller",
    entityId: gated.ctx.seller.id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({
    success: true,
    seller: toPublicSeller(updated),
  });
}
