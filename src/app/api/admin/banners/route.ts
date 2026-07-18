import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  deleteBanner,
  listBanners,
  upsertBanner,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  imageUrl: z.string().min(1),
  linkUrl: z.string().nullable().optional(),
  placement: z.string().optional(),
  sortOrder: z.number().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "banners.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listBanners() });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "banners.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await upsertBanner(parsed.data);
  await logAdminAction({
    action: parsed.data.id ? "banner.update" : "banner.create",
    entityType: "banner",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "banners.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await deleteBanner(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "banner.delete",
    entityType: "banner",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
