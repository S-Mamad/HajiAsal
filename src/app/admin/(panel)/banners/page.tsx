"use client";

import { AdminSimpleModulePage } from "@/components/admin/modules/AdminSimpleModulePage";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";

type Banner = {
  id: string;
  title: string;
  imageUrl: string;
  linkUrl?: string | null;
  placement: string;
  isActive: boolean;
};

export default function AdminBannersPage() {
  return (
    <AdminSimpleModulePage<Banner>
      endpoint="/api/admin/banners"
      titleCreate="بنر جدید"
      titleEdit="ویرایش بنر"
      createPermission="banners.manage"
      deletePermission="banners.manage"
      exportFilename="banners"
      searchKeys={(r) => `${r.title} ${r.placement}`}
      columns={[
        { key: "title", header: "عنوان", render: (r) => r.title },
        {
          key: "placement",
          header: "محل",
          hideOnMobile: true,
          render: (r) => r.placement,
        },
        {
          key: "status",
          header: "وضعیت",
          render: (r) => (
            <StatusBadge status={r.isActive ? "active" : "disabled"} />
          ),
        },
      ]}
      fields={[
        { key: "title", label: "عنوان", required: true },
        { key: "imageUrl", label: "آدرس تصویر", required: true, dir: "ltr" },
        { key: "linkUrl", label: "لینک", dir: "ltr" },
        {
          key: "placement",
          label: "محل نمایش",
          type: "select",
          options: [
            { value: "home_slider", label: "اسلایدر صفحه اصلی" },
            { value: "category", label: "بنر دسته‌بندی" },
            { value: "campaign", label: "کمپین" },
          ],
        },
      ]}
      fromRow={(r) => ({
        title: r.title,
        imageUrl: r.imageUrl,
        linkUrl: r.linkUrl ?? "",
        placement: r.placement,
      })}
      toPayload={(v, editing) => ({
        id: editing?.id,
        title: v.title,
        imageUrl: v.imageUrl,
        linkUrl: v.linkUrl || null,
        placement: v.placement || "home_slider",
        isActive: true,
      })}
    />
  );
}
