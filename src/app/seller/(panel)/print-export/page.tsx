"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";
import { exportToCsv } from "@/lib/admin/export";

export default function SellerPrintExportPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<
    Array<{ id: string; customer: { fullName: string }; sellerSubtotal: number; status: string }>
  >([]);
  const [products, setProducts] = useState<
    Array<{ id: string; title: string; slug: string }>
  >([]);
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [doc, setDoc] = useState<"invoice" | "label" | "list" | "barcode" | "qr">(
    "invoice",
  );

  const load = useCallback(async () => {
    const [oRes, pRes] = await Promise.all([
      fetch("/api/seller/orders"),
      fetch("/api/seller/products"),
    ]);
    if (oRes.status === 401 || pRes.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const oData = await oRes.json();
    const pData = await pRes.json();
    setOrders(oData.orders ?? []);
    setProducts(pData.products ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = orders.filter((o) => selectedOrders.includes(o.id));

  const printSelected = () => {
    const html = selected
      .map(
        (o) =>
          `<div style="page-break-after:always;padding:24px;font-family:Tahoma">
            <h1>${doc === "label" ? "لیبل مرسوله" : "فاکتور فروشنده"}</h1>
            <p>سفارش: ${o.id}</p>
            <p>مشتری: ${o.customer.fullName}</p>
            <p>مبلغ: ${o.sellerSubtotal.toLocaleString("fa-IR")} تومان</p>
            <p>وضعیت: ${o.status}</p>
          </div>`,
      )
      .join("");
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`<html dir="rtl"><body>${html}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div className="space-y-4">
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

      {(doc === "invoice" || doc === "label" || doc === "list") && (
        <>
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

      {(doc === "barcode" || doc === "qr") && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-stone-200 bg-white p-4 text-center"
            >
              <p className="text-sm font-medium">{p.title}</p>
              <p className="mt-2 font-mono text-xs tracking-widest">{p.id}</p>
              {doc === "qr" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt="qr"
                  className="mx-auto mt-3 h-28 w-28"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(p.slug)}`}
                />
              ) : (
                <p className="mt-4 text-2xl tracking-[0.3em]">||||| {p.id.slice(-6)} |||||</p>
              )}
              <AdminButton
                className="mt-3"
                variant="outline"
                onClick={() => window.print()}
              >
                چاپ
              </AdminButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
