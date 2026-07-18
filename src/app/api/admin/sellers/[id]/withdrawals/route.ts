import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  listWithdrawals,
  reviewWithdrawal,
} from "@/lib/server/seller-wallet";

type Params = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Params) {
  const gated = await gateAdmin(request, "sellers.manage");
  if (!gated.ok) return gated.response;
  const { id } = await params;
  const withdrawals = await listWithdrawals(id);
  return NextResponse.json({ withdrawals });
}

const patchSchema = z.object({
  withdrawalId: z.string().min(1),
  status: z.enum(["approved", "rejected"]),
  adminNote: z.string().max(500).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const gated = await gateAdmin(request, "sellers.manage");
  if (!gated.ok) return gated.response;
  const { id: sellerId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  const updated = await reviewWithdrawal({
    withdrawalId: parsed.data.withdrawalId,
    sellerId,
    status: parsed.data.status,
    adminNote: parsed.data.adminNote,
  });
  if (!updated) {
    return NextResponse.json({ error: "درخواست یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ success: true, withdrawal: updated });
}
