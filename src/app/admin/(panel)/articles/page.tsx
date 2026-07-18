"use client";

import { AdminSimpleModulePage } from "@/components/admin/modules/AdminSimpleModulePage";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

type Article = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  body?: string | null;
  status: string;
};

export default function AdminArticlesPage() {
  return (
    <AdminSimpleModulePage<Article>
      endpoint="/api/admin/articles"
      titleCreate="مقاله جدید"
      titleEdit="ویرایش مقاله"
      createPermission="articles.manage"
      deletePermission="articles.manage"
      exportFilename="articles"
      searchKeys={(r) => `${r.title} ${r.slug}`}
      columns={[
        { key: "title", header: "عنوان", sortable: true, render: (r) => r.title },
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
        { key: "excerpt", label: "خلاصه", type: "textarea" },
        { key: "body", label: "متن", type: "textarea" },
        {
          key: "status",
          label: "وضعیت",
          type: "select",
          options: [
            { value: "draft", label: "پیش‌نویس" },
            { value: "published", label: "منتشر شده" },
          ],
        },
      ]}
      fromRow={(r) => ({
        title: r.title,
        slug: r.slug,
        excerpt: r.excerpt ?? "",
        body: r.body ?? "",
        status: r.status,
      })}
      toPayload={(v, editing) => ({
        id: editing?.id,
        title: v.title,
        slug: v.slug,
        excerpt: v.excerpt || null,
        body: v.body || null,
        status: v.status || "draft",
        publishedAt: v.status === "published" ? new Date().toISOString() : null,
      })}
    />
  );
}
