import { NextResponse } from "next/server";
import { getOrderById } from "@/lib/server/orders";
import { getSessionFromRequest } from "@/lib/auth/session";
import { normalizePhone } from "@/lib/auth/phone";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  getSellerFromRequest,
  getSellerProducts,
} from "@/lib/server/sellers";
import { getSiteSettings } from "@/lib/server/site-settings";
import {
  buildProfessionalInvoiceHtml,
  type InvoiceAudience,
} from "@/lib/server/invoice";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "سفارش یافت نشد" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const download = searchParams.get("download") === "1";
  const print = searchParams.get("print") === "1";
  const phoneParam = normalizePhone(searchParams.get("phone") ?? "");
  const trackingParam = (searchParams.get("tracking") ?? "").toUpperCase();

  const isAdmin = await isAdminRequestAuthenticatedAsync(request);
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

  if (isAdmin) {
    audience = "admin";
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
  const html = buildProfessionalInvoiceHtml(order, {
    site,
    audience,
    autoPrint: print && !download,
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
  });

  const filename = `invoice-${order.id}.html`;
  const headers: Record<string, string> = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
  };

  if (download) {
    headers["Content-Disposition"] = `attachment; filename="${filename}"`;
  } else {
    headers["Content-Disposition"] = `inline; filename="${filename}"`;
  }

  return new NextResponse(html, { headers });
}
