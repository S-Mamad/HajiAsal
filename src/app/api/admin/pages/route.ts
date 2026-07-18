import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  deleteCmsPage,
  listCmsPages,
  upsertCmsPage,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  body: z.string().nullable().optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "pages.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listCmsPages() });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "pages.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await upsertCmsPage(parsed.data);
  await logAdminAction({
    action: parsed.data.id ? "page.update" : "page.create",
    entityType: "cms_page",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "pages.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await deleteCmsPage(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "page.delete",
    entityType: "cms_page",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
