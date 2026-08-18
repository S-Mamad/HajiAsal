import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/server/orders";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  getSellerFromRequest,
  getSellerProducts,
} from "@/lib/server/sellers";
import { getSiteSettings } from "@/lib/server/site-settings";
import {
  buildProfessionalInvoiceHtml,
  type InvoiceAudience,
} from "@/lib/server/invoice";
import {
  buildInvoicePdfBuffer,
  invoicePdfFilename,
} from "@/lib/server/invoice-pdf";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  const limited = await checkRateLimitAsync(
    `invoice:${ip}`,
    30,
    15 * 60 * 1000,
  );
  if (!limited.ok) {
    return NextResponse.json(
      { error: "تعداد درخواست‌ها زیاد است" },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      },
    );
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "1";
  const phoneParam = normalizePhone(searchParams.get("phone") ?? "");
  const trackingParam = (searchParams.get("tracking") ?? "").toUpperCase();

  const adminPrint = await gateAdmin(request, "orders.print");
  const isAdminAuthed = await isAdminRequestAuthenticatedAsync(request);
  const seller = await getSellerFromRequest(request);
  const session = getSessionFromRequest(request);

  const ownsBySession =
    session &&
    (order.userId === session.userId ||
      normalizePhone(order.customer.phone) === normalizePhone(session.phone));

  const ownsByProof =
    phoneParam &&
    trackingParam &&
    normalizePhone(order.customer.phone) === phoneParam &&
    (order.trackingCode ?? "").toUpperCase() === trackingParam;

  let audience: InvoiceAudience | null = null;
  let sellerItems = order.items;
  let sellerSubtotal = order.subtotal;
  let sellerShopName: string | undefined;

  if (adminPrint.ok) {
    audience = "admin";
  } else if (isAdminAuthed) {
    return NextResponse.json(
      { error: "مجوز چاپ فاکتور ندارید" },
      { status: 403 },
    );
  } else if (seller) {
    const sellerProducts = await getSellerProducts(seller.id);
    const ids = new Set(sellerProducts.map((p) => p.id));
    sellerItems = order.items.filter((item) => ids.has(item.productId));
    if (sellerItems.length === 0) {
      return NextResponse.json(
        { error: "این سفارش متعلق به فروشگاه شما نیست" },
        { status: 403 },
      );
    }
    sellerSubtotal = sellerItems.reduce(
      (sum, item) => sum + item.weight.price * item.quantity,
      0,
    );
    sellerShopName = seller.shopName;
    audience = "seller";
  } else if (ownsBySession || ownsByProof) {
    audience = "customer";
  }

  if (!audience) {
    return NextResponse.json(
      { error: "دسترسی به فاکتور مجاز نیست" },
      { status: 403 },
    );
  }

  const site = await getSiteSettings();
  const buildOptions = {
    site,
    audience,
    ...(audience === "seller"
      ? {
          items: sellerItems,
          subtotal: sellerSubtotal,
          shipping: 0,
          discount: 0,
          total: sellerSubtotal,
          sellerShopName,
        }
      : {}),
  } as const;

  if (download) {
    try {
      const pdf = await buildInvoicePdfBuffer(order, buildOptions);
      const filename = invoicePdfFilename(order.id);
      const asciiName = `invoice-${order.id}.pdf`;
      return new NextResponse(new Uint8Array(pdf), {
        headers: {
          "Content-Type": "application/pdf",
          "Cache-Control": "no-store",
          "Content-Disposition": `attachment; filename="${asciiName}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
        },
      });
    } catch (err) {
      console.error("[invoice] pdf build failed", err);
      const detail =
        err instanceof Error && err.message.includes("فونت")
          ? err.message
          : "ساخت فایل PDF ناموفق بود. دوباره تلاش کنید یا از چاپ استفاده کنید.";
      return NextResponse.json({ error: detail }, { status: 500 });
    }
  }

  const html = buildProfessionalInvoiceHtml(order, buildOptions);

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Disposition": "inline",
    },
  });
}
