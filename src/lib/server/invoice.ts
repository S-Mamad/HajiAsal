import type { SiteConfig } from "@/types";
import type { StoredOrder } from "@/lib/server/orders";

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
  autoPrint?: boolean;
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
  if (method === "cod") return "پرداخت در محل";
  if (method === "online") return "پرداخت آنلاین";
  return "کارت به کارت";
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

/**
 * Professional RTL invoice HTML — print-ready / downloadable.
 * Use browser "Save as PDF" for PDF output without a native PDF engine.
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
  const autoPrint = options.autoPrint ?? false;

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

  return `<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(titlePrefix)} · ${escapeHtml(order.id)}</title>
  <style>
    :root {
      --ink: #1f1812;
      --muted: #6b5a48;
      --line: rgba(42, 33, 24, 0.12);
      --gold: #b8862e;
      --paper: #fffdf9;
      --soft: #f3ebe0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px;
      background: #e8dfd2;
      color: var(--ink);
      font-family: Tahoma, "Segoe UI", Arial, sans-serif;
      line-height: 1.6;
    }
    .toolbar {
      max-width: 860px;
      margin: 0 auto 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: flex-end;
    }
    .toolbar button, .toolbar a {
      appearance: none;
      border: 1px solid var(--line);
      background: #fff;
      color: var(--ink);
      border-radius: 10px;
      padding: 10px 14px;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
      text-decoration: none;
    }
    .toolbar .primary {
      background: var(--gold);
      border-color: var(--gold);
      color: #1f1812;
      font-weight: 700;
    }
    .sheet {
      max-width: 860px;
      margin: 0 auto;
      background: var(--paper);
      border: 1px solid var(--line);
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 12px 40px rgba(42, 33, 24, 0.08);
    }
    .head {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 20px;
      padding: 28px 32px 20px;
      background: linear-gradient(180deg, #fff 0%, var(--soft) 100%);
      border-bottom: 1px solid var(--line);
    }
    .brand-name {
      margin: 0;
      font-size: 28px;
      font-weight: 800;
      letter-spacing: -0.02em;
      color: var(--ink);
    }
    .brand-tag {
      margin: 6px 0 0;
      color: var(--muted);
      font-size: 13px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-top: 14px;
      padding: 6px 10px;
      border-radius: 999px;
      background: rgba(184, 134, 46, 0.14);
      color: #8a6418;
      font-size: 12px;
      font-weight: 700;
    }
    .meta-box {
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 14px 16px;
      font-size: 13px;
    }
    .meta-box .label { color: var(--muted); font-size: 11px; margin-bottom: 2px; }
    .meta-box .value { font-weight: 700; }
    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 10px;
    }
    .body { padding: 24px 32px 28px; }
    .section-title {
      margin: 0 0 12px;
      font-size: 14px;
      font-weight: 800;
      color: var(--ink);
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
      background: #fff;
      font-size: 13px;
    }
    .card h3 {
      margin: 0 0 8px;
      font-size: 12px;
      color: var(--gold);
      letter-spacing: 0.04em;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 12px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 10px;
      text-align: right;
      border-bottom: 1px solid var(--line);
      vertical-align: top;
    }
    th {
      background: var(--soft);
      font-size: 12px;
      color: var(--muted);
      font-weight: 700;
    }
    tr:last-child td { border-bottom: none; }
    .num { white-space: nowrap; font-variant-numeric: tabular-nums; }
    .strong { font-weight: 800; }
    .item-title { font-weight: 700; }
    .item-meta { color: var(--muted); font-size: 11px; margin-top: 2px; }
    .totals-wrap {
      display: grid;
      grid-template-columns: 1.2fr 0.8fr;
      gap: 16px;
      margin-top: 18px;
    }
    .notes {
      border: 1px dashed var(--line);
      border-radius: 12px;
      padding: 14px;
      color: var(--muted);
      font-size: 12px;
      background: rgba(255,255,255,0.6);
    }
    .totals {
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 8px 14px;
      background: #fff;
      font-size: 13px;
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
      margin-top: 4px;
      padding-top: 12px;
      border-top: 2px solid var(--ink);
      font-size: 16px;
      font-weight: 800;
      color: var(--gold);
    }
    .foot {
      margin-top: 22px;
      padding-top: 14px;
      border-top: 1px solid var(--line);
      color: var(--muted);
      font-size: 11px;
      text-align: center;
    }
    @media (max-width: 720px) {
      body { padding: 12px; }
      .head, .parties, .totals-wrap, .meta-grid { grid-template-columns: 1fr; }
      .body, .head { padding: 18px; }
    }
    @media print {
      body { background: #fff; padding: 0; }
      .toolbar { display: none !important; }
      .sheet {
        box-shadow: none;
        border: none;
        border-radius: 0;
        max-width: none;
      }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button type="button" class="primary" onclick="window.print()">چاپ / ذخیره PDF</button>
    <a href="?download=1">دانلود HTML فاکتور</a>
  </div>
  <div class="sheet">
    <div class="head">
      <div>
        <h1 class="brand-name">${escapeHtml(site.brand.name)}</h1>
        <p class="brand-tag">${escapeHtml(site.brand.tagline)}</p>
        <div class="badge">${escapeHtml(titlePrefix)}</div>
      </div>
      <div class="meta-box">
        <div class="label">شماره فاکتور / سفارش</div>
        <div class="value" dir="ltr">${escapeHtml(order.id)}</div>
        <div class="meta-grid">
          <div>
            <div class="label">تاریخ ثبت</div>
            <div class="value">${formatDateTime(order.createdAt)}</div>
          </div>
          <div>
            <div class="label">وضعیت</div>
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
            <th style="width:70px">تعداد</th>
            <th style="width:120px">فی</th>
            <th style="width:130px">مبلغ</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      <div class="totals-wrap">
        <div class="notes">
          <strong>توضیحات ارسال:</strong>
          ${shippingLabel(order.shippingMethod)}
          ${order.couponCode ? `<br/><strong>کد تخفیف:</strong> <span dir="ltr">${escapeHtml(order.couponCode)}</span>` : ""}
          <br/><br/>
          این سند برای پیگیری سفارش و حسابرسی فروش صادر شده است.
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

      <div class="foot">
        ${footerContact || escapeHtml(site.brand.name)}
        <br/>صدور: ${formatDate(new Date().toISOString())}
      </div>
    </div>
  </div>
  ${autoPrint ? "<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>" : ""}
</body>
</html>`;
}
