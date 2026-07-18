"use client";

import { AdminSimpleModulePage } from "@/components/admin/modules/AdminSimpleModulePage";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

type PageRow = {
  id: string;
  title: string;
  slug: string;
  body?: string | null;
  status: string;
};

export default function AdminPagesPage() {
  return (
    <AdminSimpleModulePage<PageRow>
      endpoint="/api/admin/pages"
      titleCreate="صفحه جدید"
      titleEdit="ویرایش صفحه"
      createPermission="pages.manage"
      deletePermission="pages.manage"
      exportFilename="pages"
      searchKeys={(r) => `${r.title} ${r.slug}`}
      columns={[
        { key: "title", header: "عنوان", render: (r) => r.title },
        { key: "slug", header: "اسلاگ", hideOnMobile: true, render: (r) => r.slug },
        {
          key: "status",
          header: "وضعیت",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      fields={[
        { key: "title", label: "عنوان", required: true },
        { key: "slug", label: "اسلاگ", required: true, dir: "ltr" },
        { key: "body", label: "محتوا", type: "textarea" },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "published", label: "منتشر شده" },
            { value: "draft", label: "پیش‌نویس" },
          ],
        },
      ]}
      fromRow={(r) => ({
        title: r.title,
        slug: r.slug,
        body: r.body ?? "",
        status: r.status,
      })}
      toPayload={(v, editing) => ({
        id: editing?.id,
        title: v.title,
        slug: v.slug,
        body: v.body || null,
        status: v.status || "published",
      })}
    />
  );
}
