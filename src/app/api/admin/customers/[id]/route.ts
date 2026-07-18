import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { findProfileById } from "@/lib/server/profiles";
import { getAllOrders } from "@/lib/server/orders";
import { getAddressesByUserId } from "@/lib/server/profiles";
import { normalizePhone } from "@/lib/auth/phone";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  newId,
  toIso,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";
import { logAdminAction } from "@/lib/server/audit-log";

type RouteContext = { params: Promise<{ id: string }> };

async function getWallet(userId: string) {
  if (!isMysqlConfigured()) return { balance: 0, points: 0 };
  try {
    const row = await mysqlQueryOne<RowDataPacket>(
      "SELECT balance, points FROM customer_wallets WHERE user_id = ? LIMIT 1",
      [userId],
    );
    return {
      balance: Number(row?.balance ?? 0),
      points: Number(row?.points ?? 0),
    };
  } catch {
    return { balance: 0, points: 0 };
  }
}

async function getNotes(userId: string) {
  if (!isMysqlConfigured()) return [];
  try {
    const rows = await mysqlQuery<RowDataPacket>(
      "SELECT id, note, admin_user_id, created_at FROM customer_admin_notes WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
      [userId],
    );
    return rows.map((r) => ({
      id: String(r.id),
      note: String(r.note),
      adminUserId: r.admin_user_id ? String(r.admin_user_id) : null,
      createdAt: toIso(r.created_at),
    }));
  } catch {
    return [];
  }
}

export async function GET(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "customers.view");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const profile = await findProfileById(id);

  const orders = await getAllOrders();
  const related = orders.filter((order) => {
    if (profile) {
      return (
        order.userId === profile.id ||
        normalizePhone(order.customer.phone) === normalizePhone(profile.phone)
      );
    }
    const phone = id.startsWith("guest-") ? id.slice(6) : id;
    return (
      normalizePhone(order.customer.phone) === normalizePhone(phone) ||
      order.userId === id
    );
  });

  if (!profile && related.length === 0) {
    return NextResponse.json({ error: "مشتری یافت نشد" }, { status: 404 });
  }

  const totalSpent = related
    .filter((o) => o.status !== "cancelled")
    .reduce((sum, o) => sum + o.total, 0);

  const userId = profile?.id ?? id;
  const [wallet, notes, addresses] = await Promise.all([
    profile ? getWallet(profile.id) : Promise.resolve({ balance: 0, points: 0 }),
    profile ? getNotes(profile.id) : Promise.resolve([]),
    profile ? getAddressesByUserId(profile.id).catch(() => []) : Promise.resolve([]),
  ]);

  return NextResponse.json({
    customer: profile
      ? {
          id: profile.id,
          fullName: profile.fullName,
          phone: profile.phone,
          email: profile.email,
          createdAt: profile.createdAt,
          orderCount: related.length,
          totalSpent,
        }
      : {
          id,
          fullName: related[0]?.customer.fullName ?? null,
          phone: related[0]?.customer.phone ?? "",
          email: null,
          createdAt: related[0]?.createdAt ?? new Date().toISOString(),
          orderCount: related.length,
          totalSpent,
        },
    orders: related.map((o) => ({
      id: o.id,
      status: o.status,
      total: o.total,
      createdAt: o.createdAt,
      trackingCode: o.trackingCode,
      city: o.customer.city,
    })),
    wallet,
    notes,
    addresses,
    userId,
  });
}

const noteSchema = z.object({
  note: z.string().min(1),
});

const walletSchema = z.object({
  balanceDelta: z.number().optional(),
  pointsDelta: z.number().optional(),
  note: z.string().optional(),
});

export async function POST(request: Request, context: RouteContext) {
  const gate = await gateAdmin(request, "customers.edit");
  if (!gate.ok) return gate.response;

  const { id } = await context.params;
  const profile = await findProfileById(id);
  if (!profile) {
    return NextResponse.json(
      { error: "فقط برای مشتریان ثبت‌نام‌شده" },
      { status: 400 },
    );
  }

  const body = await request.json();
  const action = body.action as string | undefined;

  if (action === "note") {
    const parsed = noteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "یادداشت نامعتبر است" }, { status: 400 });
    }
    if (isMysqlConfigured()) {
      await mysqlExecute(
        `INSERT INTO customer_admin_notes (id, user_id, note, admin_user_id, created_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          newId(),
          profile.id,
          parsed.data.note,
          gate.ctx.user?.id ?? null,
          new Date().toISOString(),
        ],
      );
    }
    await logAdminAction({
      action: "customer.note",
      entityType: "customer",
      entityId: profile.id,
      adminUserId: gate.ctx.user?.id,
    });
    return NextResponse.json({ success: true });
  }

  if (action === "wallet") {
    const parsed = walletSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات کیف پول نامعتبر" }, { status: 400 });
    }
    const balanceDelta = parsed.data.balanceDelta ?? 0;
    const pointsDelta = parsed.data.pointsDelta ?? 0;
    if (isMysqlConfigured()) {
      await mysqlExecute(
        `INSERT INTO customer_wallets (user_id, balance, points)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           balance = balance + VALUES(balance),
           points = points + VALUES(points)`,
        [profile.id, balanceDelta, pointsDelta],
      );
      await mysqlExecute(
        `INSERT INTO wallet_transactions
          (id, user_id, type, amount, points_delta, note, admin_user_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          newId(),
          profile.id,
          balanceDelta >= 0 ? "credit" : "debit",
          balanceDelta,
          pointsDelta,
          parsed.data.note ?? null,
          gate.ctx.user?.id ?? null,
          new Date().toISOString(),
        ],
      );
    }
    await logAdminAction({
      action: "customer.wallet",
      entityType: "customer",
      entityId: profile.id,
      adminUserId: gate.ctx.user?.id,
      payload: { balanceDelta, pointsDelta },
    });
    return NextResponse.json({ success: true, wallet: await getWallet(profile.id) });
  }

  return NextResponse.json({ error: "action نامعتبر" }, { status: 400 });
}
