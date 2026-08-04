"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { SellerDataTable } from "@/components/seller/ui/SellerDataTable";
import { hajiasalPath } from "@/lib/paths";

type Ticket = {
  id: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  updatedAt: string;
};

export default function SellerTicketsPage() {
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/seller/tickets");
      if (res.status === 401) {
        router.push(hajiasalPath("/seller"));
        return;
      }
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">تیکت‌های پشتیبانی</h2>
          <p className="text-sm text-stone-500">گفتگو با تیم حاجی‌عسل</p>
        </div>
        <AdminButton
          onClick={() => router.push(hajiasalPath("/seller/tickets/new"))}
        >
          تیکت جدید
        </AdminButton>
      </div>
      <SellerDataTable
        storageKey="seller.tickets.grid"
        loading={loading}
        columns={[
          {
            key: "subject",
            header: "عنوان",
            render: (r) => (
              <Link
                href={hajiasalPath(`/seller/tickets/${r.id}`)}
                className="font-medium text-amber-900 hover:underline"
              >
                {r.subject}
              </Link>
            ),
          },
          {
            key: "status",
            header: "وضعیت",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "priority",
            header: "اولویت",
            render: (r) => <StatusBadge status={r.priority} />,
          },
          {
            key: "updated",
            header: "به‌روزرسانی",
            render: (r) => new Date(r.updatedAt).toLocaleString("fa-IR"),
          },
        ]}
        data={tickets}
        rowKey={(r) => r.id}
        emptyMessage="هنوز تیکتی ثبت نکرده‌اید"
      />
    </div>
  );
}
