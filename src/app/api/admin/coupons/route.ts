import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getAllCouponsAsync } from "@/lib/server/coupons";
import { isMysqlConfigured, mysqlExecute } from "@/lib/server/mysql";
import { logAdminAction } from "@/lib/server/audit-log";

const couponSchema = z.object({
  code: z.string().min(1),
  type: z.enum(["percent", "fixed"]),
  value: z.number().positive(),
  minOrder: z.number().min(0),
  maxDiscount: z.number().optional(),
  label: z.string().min(1),
  active: z.boolean().default(true),
});

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "coupons.view");
  if (!__gate.ok) return __gate.response;

  const coupons = await getAllCouponsAsync();
  return NextResponse.json({ coupons });
}

export async function POST(request: Request) {
  const __gate = await gateAdmin(request, "coupons.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const parsed = couponSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    if (!isMysqlConfigured()) {
      return NextResponse.json(
        { error: "دیتابیس پیکربندی نشده است" },
        { status: 503 },
      );
    }

    const c = parsed.data;
    try {
      await mysqlExecute(
        `INSERT INTO coupons (code, type, value, min_order, max_discount, label, active)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           type = VALUES(type),
           value = VALUES(value),
           min_order = VALUES(min_order),
           max_discount = VALUES(max_discount),
           label = VALUES(label),
           active = VALUES(active)`,
        [
          c.code.toUpperCase(),
          c.type,
          c.value,
          c.minOrder,
          c.maxDiscount ?? null,
          c.label,
          c.active,
        ],
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطای دیتابیس";
      return NextResponse.json({ error: message }, { status: 500 });
    }

    await logAdminAction({
      action: "coupon.upsert",
      entityType: "coupon",
      entityId: c.code,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const __gate = await gateAdmin(request, "coupons.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const code = body.code as string;
    if (!code) {
      return NextResponse.json({ error: "کد الزامی است" }, { status: 400 });
    }

    if (!isMysqlConfigured()) {
      return NextResponse.json({ error: "دیتابیس پیکربندی نشده است" }, { status: 503 });
    }

    const updates: Record<string, unknown> = {};
    const setClauses: string[] = [];
    const params: unknown[] = [];
    if (body.active !== undefined) {
      updates.active = body.active;
      setClauses.push("active = ?");
      params.push(body.active ? 1 : 0);
    }
    if (body.label !== undefined) {
      updates.label = body.label;
      setClauses.push("label = ?");
      params.push(body.label);
    }
    if (body.value !== undefined) {
      updates.value = body.value;
      setClauses.push("value = ?");
      params.push(body.value);
    }

    if (setClauses.length > 0) {
      params.push(code.toUpperCase());
      try {
        await mysqlExecute(
          `UPDATE coupons SET ${setClauses.join(", ")} WHERE code = ?`,
          params,
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "خطای دیتابیس";
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }

    await logAdminAction({
      action: "coupon.update",
      entityType: "coupon",
      entityId: code,
      payload: updates,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const __gate = await gateAdmin(request, "coupons.manage");
  if (!__gate.ok) return __gate.response;

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "کد الزامی است" }, { status: 400 });
  }

  if (!isMysqlConfigured()) {
    return NextResponse.json({ error: "دیتابیس پیکربندی نشده است" }, { status: 503 });
  }

  try {
    await mysqlExecute("DELETE FROM coupons WHERE code = ?", [code.toUpperCase()]);
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای دیتابیس";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  await logAdminAction({
    action: "coupon.delete",
    entityType: "coupon",
    entityId: code,
  });

  return NextResponse.json({ success: true });
}
