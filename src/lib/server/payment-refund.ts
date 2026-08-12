import {
  getOrderPaymentBinding,
  type PaymentProvider,
} from "./payment-refs";
import { isSnappayConfigured } from "./snappay";
import type { StoredOrder } from "./orders";
import {
  getZarinpalMerchantId,
  zarinpalRefundUrl,
} from "./zarinpal";
import { isZibalRefundConfigured } from "./zibal";

export type GatewayRefundResult =
  | { ok: true; provider: PaymentProvider; message?: string }
  | { ok: false; error: string; status?: number };

function zarinpalAccessToken(): string | null {
  return process.env.ZARINPAL_ACCESS_TOKEN?.trim() || null;
}

/**
 * Zarinpal refund requires a Personal Access Token from the panel.
 * Kept for legacy bindings only (online checkout is Zibal now).
 */
export async function refundZarinpal(input: {
  authority: string;
  amountRial?: number;
}): Promise<GatewayRefundResult> {
  const merchantId = getZarinpalMerchantId();
  const accessToken = zarinpalAccessToken();
  if (!merchantId) {
    return {
      ok: false,
      error: "زرین‌پال پیکربندی نشده است (ZARINPAL_MERCHANT_ID)",
      status: 503,
    };
  }
  if (!accessToken) {
    return {
      ok: false,
      error:
        "برای استرداد زرین‌پال، ZARINPAL_ACCESS_TOKEN را از پنل زرین‌پال تنظیم کنید",
      status: 503,
    };
  }
  if (!input.authority) {
    return { ok: false, error: "مرجع پرداخت (authority) یافت نشد", status: 400 };
  }

  try {
    const res = await fetch(zarinpalRefundUrl(), {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        authority: input.authority,
        ...(typeof input.amountRial === "number"
          ? { amount: input.amountRial }
          : {}),
      }),
      signal: AbortSignal.timeout(20_000),
    });
    const data = (await res.json().catch(() => ({}))) as {
      data?: { code?: number; message?: string };
      errors?: { message?: string; code?: number };
      message?: string;
    };

    const code = data.data?.code;
    if (res.ok && (code === 100 || code === 101)) {
      return {
        ok: true,
        provider: "zarinpal",
        message: data.data?.message ?? "استرداد زرین‌پال موفق بود",
      };
    }

    const errMsg =
      data.errors?.message ||
      data.data?.message ||
      data.message ||
      "استرداد زرین‌پال ناموفق بود";
    return { ok: false, error: errMsg, status: 502 };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "ارتباط با زرین‌پال برقرار نشد",
      status: 503,
    };
  }
}

/**
 * Zibal refund needs corporate-banking (بانکداری شرکتی) + API key.
 * We do not invent the refund endpoint: fail-closed and direct ops to panel / manualRefund.
 */
export async function refundZibal(input: {
  trackId: string;
  amountRial?: number;
}): Promise<GatewayRefundResult> {
  if (!input.trackId) {
    return {
      ok: false,
      error: "مرجع پرداخت زیبال (trackId) یافت نشد",
      status: 400,
    };
  }

  if (!isZibalRefundConfigured()) {
    return {
      ok: false,
      error:
        "استرداد خودکار زیبال فعال نیست. از پنل زیبال استرداد کنید یا در ادمین manualRefund بزنید (ZIBAL_REFUND_ENABLED + ZIBAL_API_KEY پس از بانکداری شرکتی).",
      status: 503,
    };
  }

  // Corporate refund API is separate from IPG; do not guess URLs/payloads.
  return {
    ok: false,
    error:
      "استرداد API زیبال هنوز به endpoint بانکداری شرکتی وصل نشده است. از پنل زیبال یا manualRefund استفاده کنید.",
    status: 503,
  };
}

/**
 * SnappPay (اسنپ‌پی) cancel/revert after settle.
 * Uses /api/online/payment/v1/cancel with paymentToken.
 */
export async function refundSnappay(input: {
  paymentToken: string;
}): Promise<GatewayRefundResult> {
  if (!isSnappayConfigured()) {
    return {
      ok: false,
      error: "اسنپ‌پی پیکربندی نشده است",
      status: 503,
    };
  }
  if (!input.paymentToken) {
    return {
      ok: false,
      error: "توکن پرداخت اسنپ‌پی یافت نشد",
      status: 400,
    };
  }

  try {
    const { cancelSnappayPayment } = await import("./snappay");
    const result = await cancelSnappayPayment(input.paymentToken);
    if (!result.ok) {
      return {
        ok: false,
        error: result.message ?? "لغو/استرداد اسنپ‌پی ناموفق بود",
        status: 502,
      };
    }
    return {
      ok: true,
      provider: "snappay",
      message: result.message ?? "استرداد اسنپ‌پی موفق بود",
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "ارتباط با اسنپ‌پی برقرار نشد",
      status: 503,
    };
  }
}

/**
 * Attempt real gateway refund for a paid order. Fail-closed: does not mutate order.
 */
export async function refundOrderAtGateway(
  order: StoredOrder,
): Promise<GatewayRefundResult> {
  if (order.refundedAt) {
    return {
      ok: false,
      error: "این سفارش قبلاً استرداد شده است",
      status: 400,
    };
  }

  const binding = await getOrderPaymentBinding(order.id);
  const provider: PaymentProvider =
    binding?.provider ??
    (order.paymentMethod === "snappay" ? "snappay" : "zibal");

  if (provider === "snappay") {
    const token = binding?.paymentRef;
    if (!token) {
      return {
        ok: false,
        error: "مرجع پرداخت اسنپ‌پی برای این سفارش یافت نشد",
        status: 400,
      };
    }
    return refundSnappay({ paymentToken: token });
  }

  if (provider === "zarinpal") {
    const authority = binding?.paymentRef;
    if (!authority) {
      return {
        ok: false,
        error: "مرجع پرداخت زرین‌پال (authority) برای این سفارش یافت نشد",
        status: 400,
      };
    }
    return refundZarinpal({
      authority,
      amountRial: Math.round(order.total * 10),
    });
  }

  const trackId = binding?.paymentRef;
  if (!trackId) {
    return {
      ok: false,
      error: "مرجع پرداخت زیبال (trackId) برای این سفارش یافت نشد",
      status: 400,
    };
  }

  return refundZibal({
    trackId,
    amountRial: Math.round(order.total * 10),
  });
}
