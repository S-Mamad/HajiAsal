import { existsSync } from "node:fs";
import { join } from "node:path";
import { PassThrough } from "node:stream";
import PDFDocument from "pdfkit";
import { textBidi } from "bidi-shaper/pdfkit";
import type { StoredOrder } from "@/lib/server/orders";
import { getBrandLogoDataUri } from "@/lib/server/brand-logo";
import { tomanAmountInWords } from "@/lib/persian-words";
import type { InvoiceBuildOptions } from "@/lib/server/invoice";

const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 36;
const CONTENT_W = PAGE_W - MARGIN * 2;

const COLORS = {
  ink: "#1c140e",
  muted: "#6b5a48",
  line: "#d8cbb8",
  gold: "#b8862e",
  soft: "#f6efe4",
  white: "#ffffff",
};

function fontPath(file: string): string {
  const resolved = join(process.cwd(), "public", "fonts", "vazirmatn", file);
  if (!existsSync(resolved)) {
    throw new Error(
      `فونت فاکتور روی سرور پیدا نشد (${file}). فایل را در public/fonts/vazirmatn قرار دهید.`,
    );
  }
  return resolved;
}

function formatPrice(amount: number): string {
  return `${Math.round(amount).toLocaleString("fa-IR")} تومان`;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function paymentLabel(method: StoredOrder["paymentMethod"]): string {
  if (method === "snappay") return "خرید اقساطی اسنپ‌پی";
  return "پرداخت آنلاین";
}

function statusLabel(status: StoredOrder["status"]): string {
  const map: Record<StoredOrder["status"], string> = {
    pending_payment: "در انتظار پرداخت",
    confirmed: "تأیید شده",
    processing: "در حال آماده‌سازی",
    shipped: "ارسال شده",
    delivered: "تحویل شده",
    cancelled: "لغو شده",
  };
  return map[status] ?? status;
}

function shippingLabel(method?: string): string {
  if (method === "express") return "ارسال سریع";
  if (method === "pickup") return "تحویل حضوری";
  return "ارسال عادی";
}

function titleForAudience(
  audience: InvoiceBuildOptions["audience"],
  sellerShopName?: string,
): string {
  if (audience === "seller") {
    return sellerShopName
      ? `فاکتور فروشنده · ${sellerShopName}`
      : "فاکتور فروشنده";
  }
  if (audience === "admin") return "فاکتور رسمی فروش";
  return "فاکتور خرید";
}

function rtlText(
  doc: PDFKit.PDFDocument,
  text: string,
  x: number,
  y: number,
  options: PDFKit.Mixins.TextOptions & {
    bidi?: { direction?: "rtl" | "ltr" | "auto" };
  } = {},
): void {
  const width = options.width ?? CONTENT_W;
  // bidi-shaper's PdfKitDocLike is a structural subset; cast keeps TS happy with pdfkit types.
  textBidi(doc as never, text, x, y, {
    ...options,
    width,
    align: options.align ?? "right",
    bidi: { direction: "rtl", ...(options.bidi ?? {}) },
  });
}

function drawRoundedRect(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fill?: string,
  stroke?: string,
) {
  doc.save();
  if (fill) doc.fillColor(fill);
  if (stroke) doc.strokeColor(stroke);
  doc.roundedRect(x, y, w, h, r);
  if (fill && stroke) doc.fillAndStroke();
  else if (fill) doc.fill();
  else doc.stroke();
  doc.restore();
}

function tryDrawLogo(doc: PDFKit.PDFDocument, x: number, y: number): number {
  try {
    const uri = getBrandLogoDataUri();
    if (uri.startsWith("data:image/png;base64,")) {
      const buf = Buffer.from(uri.slice("data:image/png;base64,".length), "base64");
      doc.image(buf, x, y, { height: 52 });
      return 52;
    }
    if (uri.startsWith("/") || uri.startsWith("http")) {
      // absolute path under public when possible
      const local = join(process.cwd(), "public", "images", "hajiasal", "brand", "logo-mark.png");
      doc.image(local, x, y, { height: 52 });
      return 52;
    }
  } catch {
    /* logo optional */
  }
  return 0;
}

export async function buildInvoicePdfBuffer(
  order: StoredOrder,
  options: InvoiceBuildOptions,
): Promise<Buffer> {
  const { site, audience } = options;
  const items = options.items ?? order.items;
  const subtotal = options.subtotal ?? order.subtotal;
  const shipping = options.shipping ?? order.shipping;
  const discount = options.discount ?? order.discount;
  const total = options.total ?? order.total;
  const docTitle = titleForAudience(audience, options.sellerShopName);
  const totalInWords = tomanAmountInWords(total);

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    info: {
      Title: `${docTitle} · ${order.id}`,
      Author: site.brand.name,
      Subject: "فاکتور فروش",
      Creator: site.brand.name,
    },
  });

  doc.registerFont("Vazir", fontPath("Vazirmatn-Regular.ttf"));
  doc.registerFont("VazirBold", fontPath("Vazirmatn-Bold.ttf"));

  const chunks: Buffer[] = [];
  const stream = new PassThrough();
  doc.pipe(stream);
  const done = new Promise<Buffer>((resolve, reject) => {
    stream.on("data", (c: Buffer) => chunks.push(c));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
    doc.on("error", reject);
  });

  // Soft header band
  doc.save();
  doc.rect(0, 0, PAGE_W, 118).fill(COLORS.soft);
  doc.restore();
  doc
    .moveTo(MARGIN, 118)
    .lineTo(PAGE_W - MARGIN, 118)
    .lineWidth(2)
    .strokeColor(COLORS.gold)
    .stroke();

  const logoH = tryDrawLogo(doc, PAGE_W - MARGIN - 48, 28);
  const brandX = MARGIN;
  doc.font("VazirBold").fontSize(20).fillColor(COLORS.ink);
  rtlText(doc, site.brand.name, brandX, 32, { width: CONTENT_W - (logoH ? 60 : 0) });
  doc.font("Vazir").fontSize(10).fillColor(COLORS.muted);
  rtlText(doc, site.brand.tagline || "", brandX, 58, {
    width: CONTENT_W - (logoH ? 60 : 0),
  });

  drawRoundedRect(doc, MARGIN, 78, 120, 22, 4, COLORS.white, COLORS.gold);
  doc.font("VazirBold").fontSize(10).fillColor(COLORS.gold);
  rtlText(doc, docTitle, MARGIN + 6, 82, { width: 108 });

  // Meta box (left side visually = higher x in LTR PDF coords... we place on left of page)
  const metaX = MARGIN;
  const metaY = 132;
  drawRoundedRect(doc, metaX, metaY, CONTENT_W, 72, 8, COLORS.white, COLORS.line);

  const metaRows: Array<[string, string]> = [
    ["شماره فاکتور", order.id],
    ["تاریخ صدور", formatDateTime(order.createdAt)],
    ["وضعیت", statusLabel(order.status)],
    ["پرداخت", paymentLabel(order.paymentMethod)],
  ];
  if (order.trackingCode) {
    metaRows.push(["کد پیگیری", order.trackingCode]);
  }
  const colW = CONTENT_W / Math.min(metaRows.length, 4);
  metaRows.slice(0, 4).forEach(([label, value], i) => {
    const x = metaX + CONTENT_W - (i + 1) * colW;
    doc.font("Vazir").fontSize(8).fillColor(COLORS.muted);
    rtlText(doc, label, x + 8, metaY + 12, { width: colW - 16 });
    doc.font("VazirBold").fontSize(10).fillColor(COLORS.ink);
    rtlText(doc, value, x + 8, metaY + 28, { width: colW - 16 });
  });
  if (metaRows.length > 4) {
    const [label, value] = metaRows[4]!;
    doc.font("Vazir").fontSize(8).fillColor(COLORS.muted);
    rtlText(doc, label, metaX + 8, metaY + 48, { width: CONTENT_W / 2 - 16 });
    doc.font("VazirBold").fontSize(10).fillColor(COLORS.ink);
    rtlText(doc, value, metaX + 8, metaY + 58, { width: CONTENT_W / 2 - 16 });
  }

  // Parties
  let y = metaY + 88;
  const half = (CONTENT_W - 12) / 2;
  const sellerBoxX = MARGIN + half + 12;
  const buyerBoxX = MARGIN;

  drawRoundedRect(doc, sellerBoxX, y, half, 96, 8, COLORS.white, COLORS.line);
  drawRoundedRect(doc, buyerBoxX, y, half, 96, 8, COLORS.white, COLORS.line);

  doc.font("VazirBold").fontSize(10).fillColor(COLORS.gold);
  rtlText(doc, "فروشنده", sellerBoxX + 10, y + 10, { width: half - 20 });
  doc.font("VazirBold").fontSize(11).fillColor(COLORS.ink);
  rtlText(doc, site.brand.name, sellerBoxX + 10, y + 28, { width: half - 20 });
  doc.font("Vazir").fontSize(9).fillColor(COLORS.ink);
  const sellerLines = [
    site.footer.address || "",
    site.footer.phone || "",
    site.footer.email || "",
    options.sellerShopName ? `سهم فروشگاه: ${options.sellerShopName}` : "",
  ].filter(Boolean);
  let sy = y + 44;
  for (const line of sellerLines) {
    rtlText(doc, line, sellerBoxX + 10, sy, { width: half - 20 });
    sy += 12;
  }

  doc.font("VazirBold").fontSize(10).fillColor(COLORS.gold);
  rtlText(doc, "خریدار", buyerBoxX + 10, y + 10, { width: half - 20 });
  doc.font("VazirBold").fontSize(11).fillColor(COLORS.ink);
  rtlText(doc, order.customer.fullName, buyerBoxX + 10, y + 28, {
    width: half - 20,
  });
  doc.font("Vazir").fontSize(9).fillColor(COLORS.ink);
  const buyerLines = [
    order.customer.phone,
    `${order.customer.province}، ${order.customer.city}`,
    order.customer.address,
    order.customer.postalCode
      ? `کدپستی: ${order.customer.postalCode}`
      : "",
  ].filter(Boolean);
  let by = y + 44;
  for (const line of buyerLines) {
    rtlText(doc, line, buyerBoxX + 10, by, { width: half - 20 });
    by += 12;
  }

  y += 112;
  doc.font("VazirBold").fontSize(12).fillColor(COLORS.ink);
  rtlText(doc, "اقلام فاکتور", MARGIN, y, { width: CONTENT_W });
  y += 22;

  // Table header
  const cols = [
    { key: "row", w: 28, label: "ردیف" },
    { key: "title", w: 190, label: "شرح کالا" },
    { key: "qty", w: 40, label: "تعداد" },
    { key: "unit", w: 36, label: "واحد" },
    { key: "price", w: 100, label: "فی" },
    { key: "sum", w: CONTENT_W - 28 - 190 - 40 - 36 - 100, label: "مبلغ" },
  ] as const;

  const drawRowBg = (yy: number, h: number, fill: string) => {
    doc.save();
    doc.rect(MARGIN, yy, CONTENT_W, h).fill(fill);
    doc.restore();
  };

  drawRowBg(y, 22, COLORS.soft);
  doc.strokeColor(COLORS.line).lineWidth(0.8);
  doc.rect(MARGIN, y, CONTENT_W, 22).stroke();

  let cx = MARGIN;
  // columns from right to left
  const ordered = [...cols].reverse();
  for (const col of ordered) {
    doc.font("VazirBold").fontSize(8).fillColor(COLORS.ink);
    rtlText(doc, col.label, cx + 4, y + 6, { width: col.w - 8 });
    cx += col.w;
  }
  y += 22;

  items.forEach((item, index) => {
    const lineTotal = item.weight.price * item.quantity;
    const title = item.title;
    const meta = `${item.weight.label} · ${item.weight.grams.toLocaleString("fa-IR")} گرم`;
    const rowH = 36;
    if (y + rowH > PAGE_H - 160) {
      doc.addPage();
      y = MARGIN;
    }
    if (index % 2 === 1) drawRowBg(y, rowH, "#fbf8f2");
    doc.strokeColor(COLORS.line).lineWidth(0.5);
    doc.rect(MARGIN, y, CONTENT_W, rowH).stroke();

    const cells: Record<string, string> = {
      row: (index + 1).toLocaleString("fa-IR"),
      title: title,
      qty: item.quantity.toLocaleString("fa-IR"),
      unit: "عدد",
      price: formatPrice(item.weight.price),
      sum: formatPrice(lineTotal),
    };

    cx = MARGIN;
    for (const col of ordered) {
      if (col.key === "title") {
        doc.font("VazirBold").fontSize(9).fillColor(COLORS.ink);
        rtlText(doc, cells.title, cx + 4, y + 6, { width: col.w - 8 });
        doc.font("Vazir").fontSize(7).fillColor(COLORS.muted);
        rtlText(doc, meta, cx + 4, y + 20, { width: col.w - 8 });
      } else {
        doc.font("Vazir").fontSize(9).fillColor(COLORS.ink);
        rtlText(doc, cells[col.key] ?? "", cx + 4, y + 12, {
          width: col.w - 8,
        });
      }
      cx += col.w;
    }
    y += rowH;
  });

  y += 14;
  drawRoundedRect(doc, MARGIN, y, CONTENT_W, 40, 6, COLORS.soft, COLORS.line);
  doc.font("Vazir").fontSize(8).fillColor(COLORS.muted);
  rtlText(doc, "مبلغ به حروف", MARGIN + 10, y + 8, { width: CONTENT_W - 20 });
  doc.font("VazirBold").fontSize(11).fillColor(COLORS.ink);
  rtlText(doc, totalInWords, MARGIN + 10, y + 20, { width: CONTENT_W - 20 });
  y += 54;

  const totalsW = 200;
  const notesW = CONTENT_W - totalsW - 12;
  drawRoundedRect(doc, MARGIN + totalsW + 12, y, notesW, 90, 8, COLORS.white, COLORS.line);
  drawRoundedRect(doc, MARGIN, y, totalsW, 90, 8, COLORS.white, COLORS.line);

  doc.font("VazirBold").fontSize(9).fillColor(COLORS.ink);
  rtlText(doc, "توضیحات ارسال", MARGIN + totalsW + 22, y + 10, {
    width: notesW - 20,
  });
  doc.font("Vazir").fontSize(9).fillColor(COLORS.muted);
  const noteLines = [
    shippingLabel(order.shippingMethod),
    order.couponCode ? `کد تخفیف: ${order.couponCode}` : "",
    "این سند برای پیگیری سفارش صادر شده است.",
    "در صورت مغایرت تا ۷۲ ساعت با پشتیبانی تماس بگیرید.",
  ].filter(Boolean);
  let ny = y + 26;
  for (const line of noteLines) {
    rtlText(doc, line, MARGIN + totalsW + 22, ny, { width: notesW - 20 });
    ny += 14;
  }

  const totals: Array<[string, string, boolean]> = [
    ["جمع جزء", formatPrice(subtotal), false],
    ["هزینه ارسال", formatPrice(shipping), false],
  ];
  if (discount > 0) {
    totals.push(["تخفیف", `−${formatPrice(discount)}`, false]);
  }
  totals.push(["مبلغ قابل پرداخت", formatPrice(total), true]);

  let ty = y + 10;
  for (const [label, value, grand] of totals) {
    doc
      .font(grand ? "VazirBold" : "Vazir")
      .fontSize(grand ? 11 : 9)
      .fillColor(grand ? COLORS.gold : COLORS.ink);
    rtlText(doc, label, MARGIN + 10, ty, { width: 90 });
    rtlText(doc, value, MARGIN + 100, ty, { width: totalsW - 110 });
    ty += grand ? 18 : 16;
  }

  y += 110;
  doc.font("Vazir").fontSize(9).fillColor(COLORS.muted);
  rtlText(doc, "مهر و امضای فروشنده", MARGIN + CONTENT_W / 2 + 20, y, {
    width: CONTENT_W / 2 - 40,
  });
  rtlText(doc, "امضای خریدار", MARGIN + 20, y, { width: CONTENT_W / 2 - 40 });
  doc
    .moveTo(MARGIN + 40, y + 36)
    .lineTo(MARGIN + CONTENT_W / 2 - 40, y + 36)
    .strokeColor(COLORS.line)
    .stroke();
  doc
    .moveTo(MARGIN + CONTENT_W / 2 + 40, y + 36)
    .lineTo(PAGE_W - MARGIN - 40, y + 36)
    .strokeColor(COLORS.line)
    .stroke();

  const footerBits = [
    site.footer.phone ? `تلفن: ${site.footer.phone}` : "",
    site.footer.email ? `ایمیل: ${site.footer.email}` : "",
    site.footer.address ? `آدرس: ${site.footer.address}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  doc
    .moveTo(MARGIN, PAGE_H - 48)
    .lineTo(PAGE_W - MARGIN, PAGE_H - 48)
    .strokeColor(COLORS.line)
    .stroke();
  doc.font("Vazir").fontSize(8).fillColor(COLORS.muted);
  rtlText(doc, footerBits || site.brand.name, MARGIN, PAGE_H - 40, {
    width: CONTENT_W,
  });

  doc.end();
  return done;
}

export function invoicePdfFilename(orderId: string): string {
  return `فاکتور-${orderId}.pdf`;
}
