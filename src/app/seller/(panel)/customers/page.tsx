"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type Customer = {
  phone: string;
  fullName: string;
  city: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt: string;
};

export default function SellerCustomersPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/customers");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setCustomers(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500">فقط مشتریان خریدار از فروشگاه شما</p>
      <SellerDataTable
        storageKey="seller.customers.grid"
        loading={loading}
        searchable
        searchKeys={(r) => `${r.fullName} ${r.phone} ${r.city}`}
        columns={[
          { key: "name", header: "نام", render: (r) => r.fullName },
          { key: "phone", header: "موبایل", render: (r) => r.phone },
          { key: "city", header: "شهر", render: (r) => r.city },
          {
            key: "orders",
            header: "سفارش‌ها",
            render: (r) => r.orderCount,
          },
          {
            key: "spent",
            header: "مبلغ خرید",
            render: (r) => (
              <span className="tabular-nums">
                {r.totalSpent.toLocaleString("fa-IR")}
              </span>
            ),
          },
          {
            key: "actions",
            header: "",
            render: (r) => (
              <Link
                href={hajiasalPath(
                  `/seller/customers/${encodeURIComponent(r.phone)}`,
                )}
                className="text-sm text-amber-800 hover:underline"
              >
                جزئیات
              </Link>
            ),
          },
        ]}
        data={customers}
        rowKey={(r) => r.phone}
        emptyMessage="هنوز مشتری‌ای ندارید"
      />
      <AdminButton variant="outline" onClick={() => void load()}>
        بروزرسانی
      </AdminButton>
    </div>
  );
}
