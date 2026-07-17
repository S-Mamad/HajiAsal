import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { logAdminAction } from "@/lib/server/audit-log";
import {
  getProductByIdAsync,
  setProductApprovalAsync,
} from "@/lib/server/products-store";

type Params = { params: Promise<{ id: string }> };

const approvalSchema = z.object({
  approvalStatus: z.enum(["pending", "approved", "rejected"]),
  reviewNote: z.string().max(2000).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const parsed = approvalSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const existing = await getProductByIdAsync(id, { allowHidden: true });
    if (!existing) {
      return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
    }
    if (!existing.sellerId) {
      return NextResponse.json(
        { error: "فقط محصولات فروشنده نیاز به تأیید دارند" },
        { status: 400 },
      );
    }

    const product = await setProductApprovalAsync(
      id,
      parsed.data.approvalStatus,
      parsed.data.reviewNote,
    );

    if (!product) {
      return NextResponse.json({ error: "به‌روزرسانی ناموفق بود" }, { status: 500 });
    }

    await logAdminAction({
      action: "seller_product.approval",
      entityType: "product",
      entityId: id,
      payload: {
        approvalStatus: parsed.data.approvalStatus,
        sellerId: existing.sellerId,
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
