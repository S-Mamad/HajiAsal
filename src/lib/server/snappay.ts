import { SNAPPPAY_FEE_PERCENT } from "@/lib/snappay-constants";

/** SnappPay (اسنپ‌پی) installment gateway helpers */

export { SNAPPPAY_FEE_PERCENT };

export function isSnappayConfigured(): boolean {
  return Boolean(
    process.env.SNAPPPAY_BASE_URL?.trim() &&
      process.env.SNAPPPAY_CLIENT_ID?.trim() &&
      process.env.SNAPPPAY_CLIENT_SECRET?.trim() &&
      process.env.SNAPPPAY_USERNAME?.trim() &&
      process.env.SNAPPPAY_PASSWORD?.trim(),
  );
}

export function applySnappayFee(cashTotal: number): number {
  return Math.round(cashTotal * (1 + SNAPPPAY_FEE_PERCENT / 100));
}

function baseUrl(): string {
  return (process.env.SNAPPPAY_BASE_URL ?? "").replace(/\/$/, "");
}

async function getBearerToken(): Promise<string> {
  const url = `${baseUrl()}/api/online/v1/oauth/token`;
  const basic = Buffer.from(
    `${process.env.SNAPPPAY_CLIENT_ID}:${process.env.SNAPPPAY_CLIENT_SECRET}`,
  ).toString("base64");

  const body = new URLSearchParams({
    grant_type: "password",
    scope: "online-merchant",
    username: process.env.SNAPPPAY_USERNAME ?? "",
    password: process.env.SNAPPPAY_PASSWORD ?? "",
  });

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const data = (await res.json()) as {
    access_token?: string;
    error?: string;
    error_description?: string;
  };

  if (!res.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "خطا در دریافت توکن اسنپ‌پی",
    );
  }
  return data.access_token;
}

export async function createSnappayPayment(input: {
  amountRial: number;
  cartList: Array<{
    id: number | string;
    name: string;
    count: number;
    amount: number;
    category: string;
    commissionType: number;
  }>;
  returnURL: string;
  transactionId: string;
  mobile?: string;
  discountAmount?: number;
  externalSourceAmount?: number;
}): Promise<{ paymentToken: string; paymentPageUrl: string }> {
  const token = await getBearerToken();
  const url = `${baseUrl()}/api/online/payment/v1/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: input.amountRial,
      cartList: input.cartList,
      discountAmount: Math.max(0, Math.round(input.discountAmount ?? 0)),
      externalSourceAmount: Math.max(
        0,
        Math.round(input.externalSourceAmount ?? 0),
      ),
      mobile: input.mobile,
      paymentMethodTypeDto: "INSTALLMENT",
      returnURL: input.returnURL,
      transactionId: input.transactionId,
    }),
  });

  const data = (await res.json()) as {
    successful?: boolean;
    response?: {
      paymentToken?: string;
      paymentPageUrl?: string;
    };
    errorData?: { message?: string };
    message?: string;
  };

  const paymentToken = data.response?.paymentToken;
  const paymentPageUrl = data.response?.paymentPageUrl;

  if (!res.ok || !data.successful || !paymentToken || !paymentPageUrl) {
    throw new Error(
      data.errorData?.message ||
        data.message ||
        "خطا در ایجاد پرداخت اسنپ‌پی",
    );
  }

  return { paymentToken, paymentPageUrl };
}

export async function verifyAndSettleSnappay(
  paymentToken: string,
  options?: { expectedAmountRial?: number },
): Promise<{
  ok: boolean;
  message?: string;
  amountRial?: number;
}> {
  const token = await getBearerToken();

  const verifyRes = await fetch(
    `${baseUrl()}/api/online/payment/v1/verify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentToken }),
    },
  );
  const verifyData = (await verifyRes.json()) as {
    successful?: boolean;
    errorData?: { message?: string };
    message?: string;
    response?: {
      amount?: number;
      transactionAmount?: number;
    };
  };

  if (!verifyRes.ok || !verifyData.successful) {
    return {
      ok: false,
      message:
        verifyData.errorData?.message ||
        verifyData.message ||
        "تأیید پرداخت اسنپ‌پی ناموفق بود",
    };
  }

  const reportedAmount =
    typeof verifyData.response?.amount === "number"
      ? verifyData.response.amount
      : typeof verifyData.response?.transactionAmount === "number"
        ? verifyData.response.transactionAmount
        : undefined;

  if (
    typeof options?.expectedAmountRial === "number" &&
    typeof reportedAmount === "number" &&
    Math.round(reportedAmount) !== Math.round(options.expectedAmountRial)
  ) {
    console.error(
      "[snappay] amount mismatch",
      {
        expected: options.expectedAmountRial,
        reported: reportedAmount,
      },
    );
    return {
      ok: false,
      message: "مبلغ پرداخت با سفارش هم‌خوانی ندارد",
      amountRial: reportedAmount,
    };
  }

  if (
    typeof options?.expectedAmountRial === "number" &&
    reportedAmount == null
  ) {
    console.warn(
      "[snappay] verify response had no amount; relying on payment-ref bind",
      { expected: options.expectedAmountRial },
    );
  }

  const settleRes = await fetch(
    `${baseUrl()}/api/online/payment/v1/settle`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paymentToken }),
    },
  );
  const settleData = (await settleRes.json()) as {
    successful?: boolean;
    errorData?: { message?: string };
    message?: string;
  };

  if (!settleRes.ok || !settleData.successful) {
    return {
      ok: false,
      message:
        settleData.errorData?.message ||
        settleData.message ||
        "تسویه پرداخت اسنپ‌پی ناموفق بود",
    };
  }

  return { ok: true, amountRial: reportedAmount };
}

/** Cancel / reverse a settled SnappPay payment (refund path). */
export async function cancelSnappayPayment(
  paymentToken: string,
): Promise<{ ok: boolean; message?: string }> {
  const token = await getBearerToken();
  const url = `${baseUrl()}/api/online/payment/v1/cancel`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ paymentToken }),
    signal: AbortSignal.timeout(20_000),
  });

  const data = (await res.json().catch(() => ({}))) as {
    successful?: boolean;
    errorData?: { message?: string };
    message?: string;
  };

  if (!res.ok || !data.successful) {
    return {
      ok: false,
      message:
        data.errorData?.message ||
        data.message ||
        "لغو پرداخت اسنپ‌پی ناموفق بود",
    };
  }

  return { ok: true, message: data.message ?? "پرداخت اسنپ‌پی لغو شد" };
}
