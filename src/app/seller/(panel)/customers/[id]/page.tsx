"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

export default function SellerCustomerDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const phone = decodeURIComponent(params.id ?? "");
  const [data, setData] = useState<{
    customer?: { fullName: string; phone: string; city: string; orderCount: number; totalSpent: number };
    orders?: Array<{ id: string; sellerSubtotal: number; status: string; createdAt: string }>;
  }>({});

  const load = useCallback(async () => {
    const res = await fetch(
      `/api/seller/customers?phone=${encodeURIComponent(phone)}`,
    );
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    if (res.status === 404) {
      router.push(hajiasalPath("/seller/customers"));
      return;
    }
    setData(await res.json());
  }, [phone, router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <AdminButton
        variant="outline"
        onClick={() => router.push(hajiasalPath("/seller/customers"))}
      >
        بازگشت
      </AdminButton>
      {data.customer ? (
        <div className="rounded-xl border border-stone-200 bg-white p-4">
          <h3 className="text-lg font-semibold">{data.customer.fullName}</h3>
          <p className="mt-1 text-sm text-stone-600">
            {data.customer.phone} · {data.customer.city}
          </p>
          <p className="mt-2 text-sm">
            {data.customer.orderCount} سفارش ·{" "}
            <span className="tabular-nums">
              {data.customer.totalSpent.toLocaleString("fa-IR")} تومان
            </span>
          </p>
        </div>
      ) : null}
      <ul className="space-y-2">
        {(data.orders ?? []).map((o) => (
          <li
            key={o.id}
            className="flex items-center justify-between rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"
          >
            <a
              href={hajiasalPath(`/seller/orders/${o.id}`)}
              className="text-amber-900 hover:underline"
            >
              {o.id}
            </a>
            <span className="tabular-nums">
              {o.sellerSubtotal.toLocaleString("fa-IR")}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
