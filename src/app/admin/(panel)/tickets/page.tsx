"use client";

import { AdminSimpleModulePage } from "@/components/admin/modules/AdminSimpleModulePage";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

type Ticket = {
  id: string;
  subject: string;
  customerName?: string | null;
  customerPhone?: string | null;
  status: string;
  priority: string;
};

export default function AdminTicketsPage() {
  return (
    <AdminSimpleModulePage<Ticket>
      endpoint="/api/admin/tickets"
      titleCreate="تیکت جدید"
      titleEdit="ویرایش تیکت"
      createPermission="tickets.manage"
      exportFilename="tickets"
      searchKeys={(r) =>
        `${r.subject} ${r.customerName ?? ""} ${r.customerPhone ?? ""}`
      }
      columns={[
        { key: "subject", header: "موضوع", render: (r) => r.subject },
        {
          key: "customer",
          header: "مشتری",
          hideOnMobile: true,
          render: (r) => r.customerName || r.customerPhone || "—",
        },
        {
          key: "priority",
          header: "اولویت",
          render: (r) => <StatusBadge status={r.priority} />,
        },
        {
          key: "status",
          header: "وضعیت",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      fields={[
        { key: "subject", label: "موضوع", required: true },
        { key: "customerName", label: "نام مشتری" },
        { key: "customerPhone", label: "موبایل", dir: "ltr" },
        {
          key: "priority",
          label: "اولویت",
          type: "select",
          options: [
            { value: "low", label: "کم" },
            { value: "normal", label: "عادی" },
            { value: "high", label: "بالا" },
          ],
        },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "open", label: "باز" },
            { value: "closed", label: "بسته" },
          ],
        },
      ]}
      fromRow={(r) => ({
        subject: r.subject,
        customerName: r.customerName ?? "",
        customerPhone: r.customerPhone ?? "",
        priority: r.priority,
        status: r.status,
      })}
      toPayload={(v, editing) => ({
        id: editing?.id,
        subject: v.subject,
        customerName: v.customerName || null,
        customerPhone: v.customerPhone || null,
        priority: v.priority || "normal",
        status: v.status || "open",
      })}
    />
  );
}
