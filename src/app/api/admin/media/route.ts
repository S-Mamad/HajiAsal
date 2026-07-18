import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createMedia,
  deleteMedia,
  listMedia,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const schema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  url: z.string().min(1),
  altText: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "media.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listMedia() });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "media.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await createMedia({
    ...parsed.data,
    uploadedBy: gate.ctx.user?.id,
  });
  await logAdminAction({
    action: "media.create",
    entityType: "media",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "media.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await deleteMedia(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "media.delete",
    entityType: "media",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
