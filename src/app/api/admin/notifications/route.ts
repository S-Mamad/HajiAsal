import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createNotification,
  listNotifications,
  markNotificationRead,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "notifications.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listNotifications() });
}

const createSchema = z.object({
  channel: z.enum(["panel", "email", "sms"]).default("panel"),
  title: z.string().min(1),
  body: z.string().nullable().optional(),
  targetRole: z.string().nullable().optional(),
  targetUserId: z.string().nullable().optional(),
});

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "notifications.manage");
  if (!gate.ok) return gate.response;
  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await createNotification(parsed.data);
  await logAdminAction({
    action: "notification.create",
    entityType: "notification",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "notifications.manage");
  if (!gate.ok) return gate.response;
  const body = await request.json();
  const id = body.id as string | undefined;
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await markNotificationRead(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  return NextResponse.json({ success: true });
}
