import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { logAdminAction } from "@/lib/server/audit-log";
import {
  getSellerApplicationByIdAsync,
  updateSellerApplicationAsync,
} from "@/lib/server/seller-applications-store";
import {
  createSellerAsync,
  getSellerByPhoneAsync,
  updateSellerAsync,
} from "@/lib/server/sellers";
import { notifyTelegram } from "@/lib/server/telegram-notify";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().max(2000).optional().nullable(),
  shopName: z.string().min(2).max(120).optional(),
  commissionPercent: z.number().min(0).max(100).optional(),
});

export async function GET(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "sellers.view");
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const application = await getSellerApplicationByIdAsync(id);
  if (!application) {
    return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ application });
}

export async function PATCH(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "sellers.manage");
  if (!gate.ok) return gate.response;

  const { id } = await params;
  const application = await getSellerApplicationByIdAsync(id);
  if (!application) {
    return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
  }
  if (application.status !== "pending") {
    return NextResponse.json(
      { error: "این درخواست قبلاً بررسی شده است" },
      { status: 409 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const reviewer =
      gate.ctx.user?.id ?? gate.ctx.user?.email ?? "admin";

    if (parsed.data.action === "reject") {
      const note = parsed.data.reviewNote?.trim() || null;
      if (!note) {
        return NextResponse.json(
          { error: "برای رد درخواست، یادداشت الزامی است" },
          { status: 400 },
        );
      }
      const updated = await updateSellerApplicationAsync(id, {
        status: "rejected",
        reviewNote: note,
        reviewedAt: now,
        reviewedBy: String(reviewer),
      });
      await logAdminAction({
        action: "seller_application.reject",
        entityType: "seller_application",
        entityId: id,
        payload: { phone: application.phone },
      });
      void notifyTelegram("seller.application_status", {
        id,
        fullName: application.fullName,
        phone: application.phone,
        status: "rejected",
      });
      return NextResponse.json({ success: true, application: updated });
    }

    // approve — recover partial approve if seller row already exists for this phone
    const existingSeller = await getSellerByPhoneAsync(application.phone);
    if (existingSeller) {
      if (application.status === "pending") {
        const updated = await updateSellerApplicationAsync(id, {
          status: "approved",
          reviewNote: parsed.data.reviewNote?.trim() || null,
          reviewedAt: now,
          reviewedBy: String(reviewer),
          sellerId: existingSeller.id,
        });
        await logAdminAction({
          action: "seller_application.approve",
          entityType: "seller_application",
          entityId: id,
          payload: {
            sellerId: existingSeller.id,
            phone: application.phone,
            recovered: true,
          },
        });
        void notifyTelegram("seller.application_status", {
          id,
          fullName: application.fullName,
          phone: application.phone,
          status: "approved",
        });
        return NextResponse.json({
          success: true,
          application: updated,
          sellerId: existingSeller.id,
          recovered: true,
        });
      }
      return NextResponse.json(
        {
          error:
            "این شماره قبلاً به‌عنوان فروشنده ثبت شده است. ابتدا وضعیت فروشنده موجود را بررسی کنید.",
        },
        { status: 409 },
      );
    }

    const shopName =
      parsed.data.shopName?.trim() ||
      `فروشگاه ${application.fullName}`;

    const seller = await createSellerAsync({
      shopName,
      ownerName: application.fullName,
      phone: application.phone,
      status: "active",
      notes: `از درخواست ${application.id}`,
      commissionPercent: parsed.data.commissionPercent ?? 10,
    });

    try {
      await updateSellerAsync(seller.id, {
        address: application.address,
        bankCard: application.bankCard,
        contactPhone: application.phone,
      });

      const updated = await updateSellerApplicationAsync(id, {
        status: "approved",
        reviewNote: parsed.data.reviewNote?.trim() || null,
        reviewedAt: now,
        reviewedBy: String(reviewer),
        sellerId: seller.id,
      });

      await logAdminAction({
        action: "seller_application.approve",
        entityType: "seller_application",
        entityId: id,
        payload: { sellerId: seller.id, phone: application.phone },
      });

      void notifyTelegram("seller.application_status", {
        id,
        fullName: application.fullName,
        phone: application.phone,
        status: "approved",
      });

      return NextResponse.json({
        success: true,
        application: updated,
        sellerId: seller.id,
      });
    } catch (approveError) {
      // Seller already created — surface clear error so ops can retry (recover path above).
      const message =
        approveError instanceof Error
          ? approveError.message
          : "تأیید درخواست بعد از ایجاد فروشنده ناقص ماند؛ دوباره تلاش کنید.";
      return NextResponse.json({ error: message, sellerId: seller.id }, { status: 503 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    const status = message.includes("قبلاً") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
