import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { SiteConfig } from "@/types";
import type { StoredOrder } from "@/lib/server/orders";
import { getBrandLogoDataUri } from "@/lib/server/brand-logo";
import { tomanAmountInWords } from "@/lib/persian-words";

export type InvoiceAudience = "customer" | "admin" | "seller";

export interface InvoiceBuildOptions {
  site: SiteConfig;
  audience: InvoiceAudience;
  /** When set, only these line items appear (seller share). */
  items?: StoredOrder["items"];
  subtotal?: number;
  shipping?: number;
  discount?: number;
  total?: number;
  sellerShopName?: string;
  /**
   * @deprecated PDF is generated on the server via `?download=1`.
   * Kept for call-site compatibility; ignored.
   */
  autoDownloadPdf?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatPrice(amount: number): string {
  return `${Math.round(amount).toLocaleString("fa-IR")} تومان`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fa-IR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
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

let cachedFontFaceCss: string | undefined;

function vazirmatnFontFaceCss(): string {
  if (cachedFontFaceCss) return cachedFontFaceCss;
  const fontsDir = join(process.cwd(), "public", "fonts", "vazirmatn");
  try {
    const regular = readFileSync(join(fontsDir, "Vazirmatn-Regular.woff2"));
    const bold = readFileSync(join(fontsDir, "Vazirmatn-Bold.woff2"));
    cachedFontFaceCss = `
    @font-face {
      font-family: "Vazirmatn";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url(data:font/woff2;base64,${regular.toString("base64")}) format("woff2");
    }
    @font-face {
      font-family: "Vazirmatn";
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url(data:font/woff2;base64,${bold.toString("base64")}) format("woff2");
    }`;
  } catch {
    cachedFontFaceCss = `
    @font-face {
      font-family: "Vazirmatn";
      font-style: normal;
      font-weight: 400;
      font-display: swap;
      src: url("/fonts/vazirmatn/Vazirmatn-Regular.woff2") format("woff2");
    }
    @font-face {
      font-family: "Vazirmatn";
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url("/fonts/vazirmatn/Vazirmatn-Bold.woff2") format("woff2");
    }`;
  }
  return cachedFontFaceCss;
}

/**
 * RTL invoice preview (print-friendly). PDF download is served by the API.
 */
export function buildProfessionalInvoiceHtml(
  order: StoredOrder,
  options: InvoiceBuildOptions,
): string {
  const { site, audience } = options;
  const items = options.items ?? order.items;
  const subtotal = options.subtotal ?? order.subtotal;
  const shipping = options.shipping ?? order.shipping;
  const discount = options.discount ?? order.discount;
  const total = options.total ?? order.total;

  const titlePrefix =
    audience === "seller"
      ? `فاکتور فروشنده${options.sellerShopName ? ` · ${options.sellerShopName}` : ""}`
      : audience === "admin"
        ? "فاکتور رسمی فروش"
        : "فاکتور خرید";

  const rows = items
    .map((item, index) => {
      const lineTotal = item.weight.price * item.quantity;
      return `
        <tr>
          <td class="num">${(index + 1).toLocaleString("fa-IR")}</td>
          <td>
            <div class="item-title">${escapeHtml(item.title)}</div>
            <div class="item-meta">${escapeHtml(item.weight.label)} · ${item.weight.grams.toLocaleString("fa-IR")} گرم</div>
          </td>
          <td class="num">${item.quantity.toLocaleString("fa-IR")}</td>
          <td>عدد</td>
          <td class="num">${formatPrice(item.weight.price)}</td>
          <td class="num strong">${formatPrice(lineTotal)}</td>
        </tr>`;
    })
    .join("");

  const footerContact = [
    site.footer.phone ? `تلفن: ${escapeHtml(site.footer.phone)}` : "",
    site.footer.email ? `ایمیل: ${escapeHtml(site.footer.email)}` : "",
    site.footer.address ? `آدرس: ${escapeHtml(site.footer.address)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const logoSrc = getBrandLogoDataUri();
  const totalInWords = tomanAmountInWords(total);

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titlePrefix)} · ${escapeHtml(order.id)}</title>
  <style>
    ${vazirmatnFontFaceCss()}
    :root {
      --ink: #1a120c;
      --muted: #7a6550;
      --line: #e2d5c2;
      --gold: #c4922a;
      --gold-deep: #8a6418;
      --paper: #fffdf9;
      --soft: #f3ebe0;
      --viewer: #3d3832;
      --accent-bar: linear-gradient(90deg, #c4922a, #e0b35a 55%, #c4922a);
    }
    * { box-sizing: border-box; }
    html, body { margin: 0; }
    body {
      background:
        radial-gradient(ellipse at top, #524a42 0%, var(--viewer) 55%);
      color: var(--ink);
      font-family: "Vazirmatn", Tahoma, sans-serif;
      font-weight: 400;
      line-height: 1.7;
      min-height: 100dvh;
    }
    .toolbar {
      position: sticky;
      top: 0;
      z-index: 20;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 14px 16px;
      background: rgba(28, 22, 18, 0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid rgba(255,255,255,0.06);
    }
    .toolbar a, .toolbar button {
      appearance: none;
      border: 0;
      border-radius: 999px;
      padding: 11px 26px;
      font-size: 14px;
      font-family: inherit;
      font-weight: 700;
      cursor: pointer;
      min-width: 148px;
      text-align: center;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.15s ease, opacity 0.15s ease;
    }
    .toolbar a:hover, .toolbar button:hover { transform: translateY(-1px); }
    .toolbar .btn-print {
      background: #fff;
      color: var(--ink);
    }
    .toolbar .btn-pdf {
      background: var(--gold);
      color: #1c140e;
      box-shadow: 0 6px 18px rgba(196, 146, 42, 0.35);
    }
    .viewer { padding: 32px 16px 56px; }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      max-width: 100%;
      margin: 0 auto;
      background: var(--paper);
      color: var(--ink);
      box-shadow: 0 24px 60px rgba(0,0,0,0.4);
      overflow: hidden;
      border-radius: 2px;
    }
    .accent { height: 4px; background: var(--accent-bar); }
    .head {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 24px;
      padding: 28px 28px 20px;
      background: var(--soft);
    }
    .brand-lockup {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .brand-logo {
      height: 72px;
      width: auto;
      object-fit: contain;
      flex-shrink: 0;
      filter: drop-shadow(0 2px 6px rgba(0,0,0,0.08));
    }
    .brand-name {
      margin: 0;
      font-size: 26px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .brand-tag {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .doc-title {
      display: inline-block;
      margin-top: 14px;
      padding: 5px 14px;
      border: 1px solid var(--gold);
      border-radius: 999px;
      color: var(--gold-deep);
      font-size: 12px;
      font-weight: 700;
      background: rgba(255,255,255,0.55);
    }
    .meta-box {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      box-shadow: 0 1px 0 rgba(255,255,255,0.8) inset;
    }
    .meta-box .label { color: var(--muted); font-size: 11px; margin-bottom: 2px; }
    .meta-box .value { font-weight: 700; word-break: break-word; }
    .meta-id {
      font-size: 15px;
      letter-spacing: 0.02em;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 12px;
    }
    .body { padding: 22px 28px 28px; }
    .section-title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .section-title::before {
      content: "";
      width: 3px;
      height: 14px;
      border-radius: 2px;
      background: var(--gold);
    }
    .parties {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 22px;
    }
    .card {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
      background: #fff;
    }
    .card h3 {
      margin: 0 0 10px;
      font-size: 12px;
      color: var(--gold-deep);
      font-weight: 700;
    }
    .card strong { font-size: 14px; }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      font-size: 13px;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td {
      padding: 11px 10px;
      text-align: right;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      background: var(--soft);
      font-size: 12px;
      font-weight: 700;
    }
    tbody tr:nth-child(even) td { background: #fbf7f1; }
    tr:last-child td { border-bottom: none; }
    .num { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 700; }
    .item-title { font-weight: 700; }
    .item-meta { color: var(--muted); font-size: 11px; margin-top: 3px; }
    .words-box {
      margin-top: 16px;
      padding: 12px 14px;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--soft);
      font-size: 13px;
    }
    .words-box .label {
      color: var(--muted);
      font-size: 11px;
      margin-bottom: 4px;
    }
    .words-box .value { font-weight: 700; }
    .totals-wrap {
      display: grid;
      grid-template-columns: 1.15fr 0.85fr;
      gap: 14px;
      margin-top: 16px;
    }
    .notes {
      border: 1px dashed var(--line);
      border-radius: 12px;
      padding: 14px;
      color: var(--muted);
      font-size: 12px;
      background: #fff;
    }
    .totals {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 8px 14px;
      font-size: 13px;
      background: #fff;
    }
    .totals .row {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid var(--line);
    }
    .totals .row:last-child { border-bottom: none; }
    .totals .grand {
      margin-top: 2px;
      padding-top: 12px;
      border-top: 2px solid var(--ink);
      font-size: 15px;
      font-weight: 700;
      color: var(--gold-deep);
    }
    .signs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 28px;
      margin-top: 36px;
      text-align: center;
      font-size: 12px;
      color: var(--muted);
    }
    .signs .line {
      margin: 40px auto 0;
      width: 68%;
      border-top: 1px solid var(--line);
      padding-top: 8px;
    }
    .foot {
      margin-top: 24px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      text-align: center;
    }
    @media (max-width: 820px) {
      .viewer { padding: 12px 8px 36px; }
      .sheet { width: 100%; min-height: 0; border-radius: 0; }
      .head, .parties, .totals-wrap, .meta-grid, .signs { grid-template-columns: 1fr; }
      .body, .head { padding: 18px; }
    }
    @page { size: A4; margin: 10mm; }
    @media print {
      body { background: #fff; }
      .toolbar { display: none !important; }
      .viewer { padding: 0; }
      .sheet {
        width: auto;
        min-height: auto;
        box-shadow: none;
        border-radius: 0;
      }
      .brand-logo, .head, .totals .grand, th, .accent, tbody tr:nth-child(even) td {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" class="btn-print" onclick="window.print()">چاپ</button>
    <a class="btn-pdf" id="btn-pdf" href="?download=1" download="invoice-${escapeHtml(order.id)}.pdf">دانلود PDF</a>
  </div>
  <div class="viewer">
    <div class="sheet" id="sheet">
      <div class="accent" aria-hidden="true"></div>
      <div class="head">
        <div>
          <div class="brand-lockup">
            <img
              class="brand-logo"
              src="${logoSrc}"
              alt="${escapeHtml(site.brand.name)}"
              width="48"
              height="72"
            />
            <div>
              <h1 class="brand-name">${escapeHtml(site.brand.name)}</h1>
              <p class="brand-tag">${escapeHtml(site.brand.tagline)}</p>
            </div>
          </div>
          <div class="doc-title">${escapeHtml(titlePrefix)}</div>
        </div>
        <div class="meta-box">
          <div class="label">شماره فاکتور</div>
          <div class="value meta-id" dir="ltr">${escapeHtml(order.id)}</div>
          <div class="meta-grid">
            <div>
              <div class="label">تاریخ صدور</div>
              <div class="value">${formatDateTime(order.createdAt)}</div>
            </div>
            <div>
              <div class="label">وضعیت سفارش</div>
              <div class="value">${statusLabel(order.status)}</div>
            </div>
            ${
              order.trackingCode
                ? `<div>
              <div class="label">کد پیگیری</div>
              <div class="value" dir="ltr">${escapeHtml(order.trackingCode)}</div>
            </div>`
                : ""
            }
            <div>
              <div class="label">روش پرداخت</div>
              <div class="value">${paymentLabel(order.paymentMethod)}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="body">
        <div class="parties">
          <div class="card">
            <h3>فروشنده</h3>
            <div><strong>${escapeHtml(site.brand.name)}</strong></div>
            <div>${escapeHtml(site.footer.address || "")}</div>
            <div dir="ltr">${escapeHtml(site.footer.phone || "")}</div>
            <div>${escapeHtml(site.footer.email || "")}</div>
            ${
              options.sellerShopName
                ? `<div style="margin-top:8px;color:var(--muted)">سهم فروشگاه: ${escapeHtml(options.sellerShopName)}</div>`
                : ""
            }
          </div>
          <div class="card">
            <h3>خریدار</h3>
            <div><strong>${escapeHtml(order.customer.fullName)}</strong></div>
            <div dir="ltr">${escapeHtml(order.customer.phone)}</div>
            <div>${escapeHtml(order.customer.province)}، ${escapeHtml(order.customer.city)}</div>
            <div>${escapeHtml(order.customer.address)}</div>
            ${
              order.customer.postalCode
                ? `<div>کدپستی: <span dir="ltr">${escapeHtml(order.customer.postalCode)}</span></div>`
                : ""
            }
          </div>
        </div>

        <h2 class="section-title">اقلام فاکتور</h2>
        <table>
          <thead>
            <tr>
              <th style="width:48px">ردیف</th>
              <th>شرح کالا</th>
              <th style="width:64px">تعداد</th>
              <th style="width:56px">واحد</th>
              <th style="width:120px">فی</th>
              <th style="width:130px">مبلغ</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="words-box">
          <div class="label">مبلغ به حروف</div>
          <div class="value">${escapeHtml(totalInWords)}</div>
        </div>

        <div class="totals-wrap">
          <div class="notes">
            <strong>توضیحات ارسال:</strong>
            ${shippingLabel(order.shippingMethod)}
            ${order.couponCode ? `<br/><strong>کد تخفیف:</strong> <span dir="ltr">${escapeHtml(order.couponCode)}</span>` : ""}
            <br/><br/>
            این سند برای پیگیری سفارش صادر شده است.
            در صورت مغایرت، حداکثر تا ۷۲ ساعت با پشتیبانی تماس بگیرید.
          </div>
          <div class="totals">
            <div class="row"><span>جمع جزء</span><span class="num">${formatPrice(subtotal)}</span></div>
            <div class="row"><span>هزینه ارسال</span><span class="num">${formatPrice(shipping)}</span></div>
            ${
              discount > 0
                ? `<div class="row"><span>تخفیف</span><span class="num">−${formatPrice(discount)}</span></div>`
                : ""
            }
            <div class="row grand"><span>مبلغ قابل پرداخت</span><span class="num">${formatPrice(total)}</span></div>
          </div>
        </div>

        <div class="signs">
          <div>
            <div class="line">مهر و امضای فروشنده</div>
          </div>
          <div>
            <div class="line">امضای خریدار</div>
          </div>
        </div>

        <div class="foot">
          ${footerContact || escapeHtml(site.brand.name)}
          <br/>تاریخ صدور سند: ${formatDate(new Date().toISOString())}
        </div>
      </div>
    </div>
  </div>
  <script>
    (function () {
      var a = document.getElementById("btn-pdf");
      if (!a) return;
      try {
        var u = new URL(window.location.href);
        u.searchParams.set("download", "1");
        a.setAttribute("href", u.pathname + u.search);
        a.setAttribute("download", "invoice-${order.id}.pdf");
      } catch (e) {
        a.setAttribute("href", "?download=1");
      }
    })();
  <\/script>
</body>
</html>`;
}
