import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createAdminUser,
  deleteAdminUser,
  listAdminUsers,
  updateAdminUser,
} from "@/lib/server/admin-auth";
import { isAdminRole, type AdminRole } from "@/lib/admin/permissions";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "admin_users.view");
  if (!gate.ok) return gate.response;
  const users = await listAdminUsers();
  return NextResponse.json({
    items: users.map((u) => ({
      id: u.id,
      fullName: u.fullName,
      email: u.email,
      phone: u.phone,
      role: u.role,
      status: u.status,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    })),
  });
}

const createSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  password: z.string().min(6),
  role: z.string(),
});

const patchSchema = z.object({
  id: z.string(),
  fullName: z.string().optional(),
  email: z.string().nullable().optional(),
  phone: z.string().nullable().optional(),
  password: z.string().min(6).optional(),
  role: z.string().optional(),
  status: z.enum(["active", "disabled"]).optional(),
});

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "admin_users.manage");
  if (!gate.ok) return gate.response;
  const body = await request.json();

  if (body.id) {
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }
    if (parsed.data.role && !isAdminRole(parsed.data.role)) {
      return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
    }
    const { id, ...patch } = parsed.data;
    const user = await updateAdminUser(id, {
      ...patch,
      role: patch.role as AdminRole | undefined,
    });
    if (!user) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
    await logAdminAction({
      action: "admin_user.update",
      entityType: "admin_user",
      entityId: id,
      adminUserId: gate.ctx.user?.id,
    });
    return NextResponse.json({
      item: {
        id: user.id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  }

  const parsed = createSchema.safeParse(body);
  if (!parsed.success || !isAdminRole(parsed.data.role)) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const user = await createAdminUser({
    fullName: parsed.data.fullName,
    email: parsed.data.email,
    phone: parsed.data.phone,
    password: parsed.data.password,
    role: parsed.data.role as AdminRole,
  });
  await logAdminAction({
    action: "admin_user.create",
    entityType: "admin_user",
    entityId: user.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({
    item: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  });
}

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "admin_users.manage");
  if (!gate.ok) return gate.response;
  const body = await request.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  if (parsed.data.role && !isAdminRole(parsed.data.role)) {
    return NextResponse.json({ error: "نقش نامعتبر است" }, { status: 400 });
  }
  const { id, ...patch } = parsed.data;
  const user = await updateAdminUser(id, {
    ...patch,
    role: patch.role as AdminRole | undefined,
  });
  if (!user) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "admin_user.update",
    entityType: "admin_user",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({
    item: {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
    },
  });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "admin_users.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }
  if (gate.ctx.user?.id === id) {
    return NextResponse.json(
      { error: "نمی‌توانید خودتان را حذف کنید" },
      { status: 400 },
    );
  }
  const ok = await deleteAdminUser(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "admin_user.delete",
    entityType: "admin_user",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
