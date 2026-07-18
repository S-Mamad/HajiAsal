"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
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
      <AdminButton onClick={() => router.push(hajiasalPath("/seller/tickets/new"))}>
        تیکت جدید
      </AdminButton>
      <SellerDataTable
        storageKey="seller.tickets.grid"
        loading={loading}
        columns={[
          {
            key: "subject",
            header: "عنوان",
            render: (r) => (
              <Link href={hajiasalPath(`/seller/tickets/${r.id}`)} className="text-amber-900 hover:underline">
                {r.subject}
              </Link>
            ),
          },
          { key: "status", header: "وضعیت", render: (r) => r.status },
          { key: "priority", header: "اولویت", render: (r) => r.priority },
          {
            key: "updated",
            header: "به‌روزرسانی",
            render: (r) => new Date(r.updatedAt).toLocaleString("fa-IR"),
          },
        ]}
        data={tickets}
        rowKey={(r) => r.id}
        emptyMessage="تیکتی نیست"
      />
    </div>
  );
}
