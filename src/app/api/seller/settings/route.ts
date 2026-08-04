import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { toPublicSeller, updateSellerAsync } from "@/lib/server/sellers";
import { logSellerActivity } from "@/lib/server/seller-activity";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "settings.manage");
  if (!gated.ok) return gated.response;

  const seller = gated.ctx.seller;
  return NextResponse.json({
    shopSettings: seller.shopSettings ?? null,
    notificationPrefs: seller.notificationPrefs ?? null,
  });
}

const patchSchema = z.object({
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
  const gated = await gateSeller(request, "settings.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
  }

  const existing = gated.ctx.seller;
  const updated = await updateSellerAsync(existing.id, {
    shopSettings:
      parsed.data.shopSettings === undefined
        ? undefined
        : parsed.data.shopSettings === null
          ? null
          : {
              ...(existing.shopSettings ?? {}),
              ...parsed.data.shopSettings,
            },
    notificationPrefs:
      parsed.data.notificationPrefs === undefined
        ? undefined
        : parsed.data.notificationPrefs === null
          ? null
          : {
              ...(existing.notificationPrefs ?? {}),
              ...parsed.data.notificationPrefs,
            },
  });

  if (!updated) {
    return NextResponse.json({ error: "به‌روزرسانی ناموفق" }, { status: 500 });
  }

  await logSellerActivity({
    sellerId: existing.id,
    action: "settings.update",
    entityType: "seller",
    entityId: existing.id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({
    success: true,
    shopSettings: updated.shopSettings ?? null,
    notificationPrefs: updated.notificationPrefs ?? null,
    seller: toPublicSeller(updated),
  });
}
