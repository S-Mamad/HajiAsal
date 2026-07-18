"use client";

import { AdminSimpleModulePage } from "@/components/admin/modules/AdminSimpleModulePage";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { ADMIN_ROLE_LABELS } from "@/lib/admin/permissions";

type UserRow = {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: keyof typeof ADMIN_ROLE_LABELS;
  status: string;
};

export default function AdminUsersPage() {
  return (
    <AdminSimpleModulePage<UserRow>
      endpoint="/api/admin/users"
      titleCreate="کاربر جدید"
      titleEdit="ویرایش کاربر"
      createPermission="admin_users.manage"
      deletePermission="admin_users.manage"
      exportFilename="admin-users"
      searchKeys={(r) =>
        `${r.fullName} ${r.email ?? ""} ${r.phone ?? ""} ${r.role}`
      }
      columns={[
        { key: "fullName", header: "نام", render: (r) => r.fullName },
        {
          key: "email",
          header: "ایمیل",
          hideOnMobile: true,
          render: (r) => r.email || "—",
        },
        {
          key: "role",
          header: "نقش",
          render: (r) => ADMIN_ROLE_LABELS[r.role] ?? r.role,
        },
        {
          key: "status",
          header: "وضعیت",
          render: (r) => <StatusBadge status={r.status} />,
        },
      ]}
      fields={[
        { key: "fullName", label: "نام", required: true },
        { key: "email", label: "ایمیل", dir: "ltr" },
        { key: "phone", label: "موبایل", dir: "ltr" },
        { key: "password", label: "رمز عبور", dir: "ltr", required: true },
        {
          key: "role",
          label: "نقش",
          type: "select",
          options: [
            { value: "super_admin", label: "مدیر کل" },
            { value: "support", label: "پشتیبان" },
            { value: "warehouse", label: "انباردار" },
            { value: "content", label: "محتوا" },
          ],
        },
      ]}
      fromRow={(r) => ({
        fullName: r.fullName,
        email: r.email ?? "",
        phone: r.phone ?? "",
        password: "",
        role: r.role,
      })}
      toPayload={(v, editing) => {
        if (editing) {
          return {
            id: editing.id,
            fullName: v.fullName,
            email: v.email || null,
            phone: v.phone || null,
            role: v.role,
            ...(v.password ? { password: v.password } : {}),
          };
        }
        return {
          fullName: v.fullName,
          email: v.email || null,
          phone: v.phone || null,
          password: v.password,
          role: v.role || "support",
        };
      }}
    />
  );
}
