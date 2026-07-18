import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import {
  createWithdrawal,
  getSellerWalletBalance,
  listSellerLedger,
  listWithdrawals,
} from "@/lib/server/seller-wallet";
import { logSellerActivity } from "@/lib/server/seller-activity";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "wallet.view");
  if (!gated.ok) return gated.response;

  const sellerId = gated.ctx.seller.id;
  const [balance, ledger, withdrawals] = await Promise.all([
    getSellerWalletBalance(sellerId),
    listSellerLedger(sellerId),
    listWithdrawals(sellerId),
  ]);
  return NextResponse.json({ balance, ledger, withdrawals });
}

const withdrawSchema = z.object({
  amount: z.number().int().positive(),
  note: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const gated = await gateSeller(request, "wallet.withdraw");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = withdrawSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "مبلغ نامعتبر است" }, { status: 400 });
  }

  try {
    const seller = gated.ctx.seller;
    const withdrawal = await createWithdrawal({
      sellerId: seller.id,
      amount: parsed.data.amount,
      bankSheba: seller.bankSheba,
      bankCard: seller.bankCard,
      note: parsed.data.note,
    });
    await logSellerActivity({
      sellerId: seller.id,
      action: "wallet.withdraw_request",
      entityType: "withdrawal",
      entityId: withdrawal.id,
      meta: { amount: parsed.data.amount },
      ip: clientIpFromRequest(request),
    });
    return NextResponse.json({ success: true, withdrawal });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطا" },
      { status: 400 },
    );
  }
}
