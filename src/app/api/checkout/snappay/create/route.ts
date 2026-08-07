import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getOrderById } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import {
  createSnappayPayment,
  isSnappayConfigured,
} from "@/lib/server/snappay";
import { setOrderPaymentRef } from "@/lib/server/payment-refs";

const createSchema = z.object({
  orderId: z.string().min(1),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "برای پرداخت باید وارد شوید" },
      { status: 401 },
    );
  }

  if (!isSnappayConfigured()) {
    return NextResponse.json(
      {
        success: false,
        available: false,
        message: "درگاه اسنپ‌پی پیکربندی نشده است.",
      },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "اطلاعات پرداخت نامعتبر است" },
        { status: 400 },
      );
    }

    const order = await getOrderById(parsed.data.orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, message: "سفارش یافت نشد" },
        { status: 404 },
      );
    }

    const owns =
      order.userId === session.userId ||
      normalizePhone(order.customer.phone) === normalizePhone(session.phone);

    if (!owns) {
      return NextResponse.json(
        { success: false, message: "دسترسی به این سفارش مجاز نیست" },
        { status: 403 },
      );
    }

    if (order.paymentMethod !== "snappay") {
      return NextResponse.json(
        { success: false, message: "این سفارش برای اسنپ‌پی نیست" },
        { status: 400 },
      );
    }

    if (order.status === "cancelled") {
      return NextResponse.json(
        { success: false, message: "این سفارش لغو شده است" },
        { status: 400 },
      );
    }

    if (order.status !== "pending_payment") {
      return NextResponse.json(
        {
          success: false,
          message: "این سفارش برای پرداخت اقساطی در دسترس نیست",
        },
        { status: 400 },
      );
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
    const returnURL = `${siteUrl}/api/checkout/snappay/verify?orderId=${encodeURIComponent(order.id)}`;
    const amountRial = Math.round(order.total * 10);

    const cartList = order.items.map((item, index) => ({
      id: index + 1,
      name: item.title.slice(0, 100),
      count: item.quantity,
      amount: Math.round(item.weight.price * item.quantity * 10),
      category: "GROCERY",
      commissionType: 100,
    }));

    const productsRial = cartList.reduce((sum, line) => sum + line.amount, 0);
    const discountRial = Math.round(Math.max(0, order.discount) * 10);
    // Align gateway amount check: cartSum - discount + shipping/fee line = amount
    const remainderRial = Math.max(
      0,
      amountRial - productsRial + discountRial,
    );
    if (remainderRial > 0) {
      cartList.push({
        id: cartList.length + 1,
        name: "هزینه ارسال و خدمات",
        count: 1,
        amount: remainderRial,
        category: "GROCERY",
        commissionType: 100,
      });
    }

    const payment = await createSnappayPayment({
      amountRial,
      cartList,
      returnURL,
      transactionId: order.id,
      mobile: session.phone,
      discountAmount: discountRial,
    });

    await setOrderPaymentRef(order.id, "snappay", payment.paymentToken);

    return NextResponse.json({
      success: true,
      available: true,
      paymentToken: payment.paymentToken,
      redirectUrl: payment.paymentPageUrl,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "خطا در اتصال به درگاه اسنپ‌پی",
      },
      { status: 502 },
    );
  }
}
