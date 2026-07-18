import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller } from "@/lib/server/seller-gate";
import {
  listSellerNotifications,
  markSellerNotificationsRead,
} from "@/lib/server/seller-notifications";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "notifications.view");
  if (!gated.ok) return gated.response;

  const data = await listSellerNotifications({
    sellerId: gated.ctx.seller.id,
    limit: 40,
  });
  return NextResponse.json(data);
}

const patchSchema = z.object({
  ids: z.array(z.string()).optional(),
  all: z.boolean().optional(),
});

export async function PATCH(request: Request) {
  const gated = await gateSeller(request, "notifications.view");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر" }, { status: 400 });
  }

  const count = await markSellerNotificationsRead({
    sellerId: gated.ctx.seller.id,
    ids: parsed.data.ids,
    all: parsed.data.all,
  });
  return NextResponse.json({ success: true, count });
}
