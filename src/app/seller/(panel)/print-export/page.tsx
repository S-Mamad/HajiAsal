"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import { escapeHtml, exportToCsv } from "@/lib/admin/export";
import { brandLogoPrintSrc } from "@/lib/brand-assets";

type SellerOrderRow = {
  id: string;
  customer: { fullName: string };
  sellerSubtotal: number;
  status: string;
};

type SellerProductRow = {
  id: string;
  title: string;
  slug: string;
};

export default function SellerPrintExportPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<SellerOrderRow[]>([]);
  const [products, setProducts] = useState<SellerProductRow[]>([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [doc, setDoc] = useState<"invoice" | "label" | "list" | "barcode" | "qr">(
    "invoice",
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [oRes, pRes] = await Promise.all([
        fetch("/api/seller/orders"),
        fetch("/api/seller/products"),
      ]);
      if (oRes.status === 401 || pRes.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }

      const messages: string[] = [];
      if (oRes.status === 403) {
        messages.push("دسترسی به سفارش‌ها برای چاپ ندارید");
      }
      if (pRes.status === 403) {
        messages.push("دسترسی به محصولات برای چاپ ندارید");
      }
      if (messages.length) {
        setError(messages.join(" · "));
      }

      let nextOrders: SellerOrderRow[] = [];
      let nextProducts: SellerProductRow[] = [];

      if (oRes.ok) {
        const oData = (await oRes.json()) as { orders?: SellerOrderRow[] };
        nextOrders = oData.orders ?? [];
      } else if (oRes.status !== 403) {
        const errBody = (await oRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError((prev) =>
          prev
            ? `${prev} · ${errBody.error ?? "خطا در بارگذاری سفارش‌ها"}`
            : (errBody.error ?? "خطا در بارگذاری سفارش‌ها"),
        );
      }

      if (pRes.ok) {
        const pData = (await pRes.json()) as { products?: SellerProductRow[] };
        nextProducts = pData.products ?? [];
      } else if (pRes.status !== 403) {
        const errBody = (await pRes.json().catch(() => ({}))) as {
          error?: string;
        };
        setError((prev) =>
          prev
            ? `${prev} · ${errBody.error ?? "خطا در بارگذاری محصولات"}`
            : (errBody.error ?? "خطا در بارگذاری محصولات"),
        );
      }

      setOrders(nextOrders);
      setProducts(nextProducts);
    } catch {
      setError("خطا در بارگذاری داده چاپ");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = orders.filter((o) => selectedOrders.includes(o.id));

  const printSelected = () => {
    const logo = brandLogoPrintSrc();
    const heading = doc === "label" ? "لیبل مرسوله" : "فاکتور فروشنده";
    const html = selected
      .map(
        (o) =>
          `<div style="page-break-after:always;padding:24px;font-family:Tahoma;color:#1c1917">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;padding-bottom:12px;border-bottom:1px solid #e7e5e4">
              <img src="${logo}" alt="حاجی عسل" height="56" style="height:56px;width:auto;object-fit:contain" />
              <h1 style="margin:0;font-size:18px">${heading}</h1>
            </div>
            <p>سفارش: ${escapeHtml(o.id)}</p>
            <p>مشتری: ${escapeHtml(o.customer.fullName)}</p>
            <p>مبلغ: ${o.sellerSubtotal.toLocaleString("fa-IR")} تومان</p>
            <p>وضعیت: ${escapeHtml(o.status)}</p>
          </div>`,
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"/><title>${heading}</title></head><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-stone-500">در حال بارگذاری...</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["invoice", "فاکتور"],
            ["label", "لیبل"],
            ["list", "لیست سفارش"],
            ["barcode", "بارکد محصول"],
            ["qr", "QR محصول"],
          ] as const
        ).map(([k, label]) => (
          <AdminButton
            key={k}
            variant={doc === k ? "primary" : "outline"}
            onClick={() => setDoc(k)}
          >
            {label}
          </AdminButton>
        ))}
      </div>

      {!loading && (doc === "invoice" || doc === "label" || doc === "list") && (
        <>
          {orders.length === 0 ? (
            <p className="rounded-xl border border-stone-200 bg-white p-4 text-sm text-stone-500">
              سفارشی برای چاپ نیست
            </p>
          ) : (
            <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-stone-200 bg-white p-3">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedOrders.includes(o.id)}
                    onChange={() =>
                      setSelectedOrders((prev) =>
                        prev.includes(o.id)
                          ? prev.filter((x) => x !== o.id)
                          : [...prev, o.id],
                      )
                    }
                  />
                  <span>{o.id}</span>
                  <span className="text-stone-500">{o.customer.fullName}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-2">
            <AdminButton onClick={printSelected} disabled={!selected.length}>
              چاپ انتخاب‌شده
            </AdminButton>
            <AdminButton
              variant="outline"
              disabled={!selected.length}
              onClick={() =>
                exportToCsv(
                  "seller-orders-selected.csv",
                  selected.map((o) => ({
                    id: o.id,
                    customer: o.customer.fullName,
                    total: o.sellerSubtotal,
                    status: o.status,
                  })),
                )
              }
            >
              Excel/CSV
            </AdminButton>
          </div>
        </>
      )}

      {!loading && (doc === "barcode" || doc === "qr") && (
        products.length === 0 ? (
          <p className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white p-4 text-sm text-zinc-500">
            محصولی برای چاپ نیست
          </p>
        ) : (
          <div className="space-y-3">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {doc === "barcode"
                ? "بارکد واقعی هنوز فعال نیست. فعلاً شناسه محصول برای برچسب متنی چاپ می‌شود."
                : "QR خارجی حذف شد. لینک محصول را به‌صورت متنی روی برچسب چاپ کنید."}
            </p>
            <div className="grid gap-3 print:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="print-label rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white p-4 text-center"
                >
                  <p className="text-sm font-medium text-zinc-900">{p.title}</p>
                  <p
                    className="mt-3 break-all font-mono text-xs tracking-wide text-zinc-700"
                    dir="ltr"
                  >
                    {doc === "qr"
                      ? hajiasalPath(`/product/${p.slug}`)
                      : p.id}
                  </p>
                  <AdminButton
                    className="mt-3 print:hidden"
                    variant="outline"
                    onClick={() => {
                      const node = document.getElementById(`print-card-${p.id}`);
                      if (!node) {
                        window.print();
                        return;
                      }
                      const win = window.open("", "_blank", "noopener,noreferrer");
                      if (!win) {
                        window.print();
                        return;
                      }
                      win.document.write(
                        `<!doctype html><html dir="rtl"><head><title>چاپ</title>
                        <style>body{font-family:tahoma,sans-serif;padding:24px;text-align:center}
                        .mono{font-family:ui-monospace,monospace;direction:ltr;word-break:break-all;margin-top:12px}</style>
                        </head><body>${node.innerHTML}</body></html>`,
                      );
                      win.document.close();
                      win.focus();
                      win.print();
                      win.close();
                    }}
                  >
                    چاپ این برچسب
                  </AdminButton>
                  <div id={`print-card-${p.id}`} className="hidden">
                    <h1>{escapeHtml(p.title)}</h1>
                    <p className="mono">
                      {doc === "qr"
                        ? escapeHtml(hajiasalPath(`/product/${p.slug}`))
                        : escapeHtml(p.id)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      )}
    </div>
  );
}
