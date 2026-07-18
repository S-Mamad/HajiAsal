import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  deleteBrand,
  listBrands,
  upsertBrand,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const schema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  logo: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  sortOrder: z.number().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "brands.view");
  if (!gate.ok) return gate.response;
  const items = await listBrands();
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "brands.manage");
  if (!gate.ok) return gate.response;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await upsertBrand(parsed.data);
  await logAdminAction({
    action: parsed.data.id ? "brand.update" : "brand.create",
    entityType: "brand",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "brands.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }
  const ok = await deleteBrand(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "brand.delete",
    entityType: "brand",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
