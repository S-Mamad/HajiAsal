"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import {
  AdminInput,
  AdminSelect,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";

type Notif = {
  id: string;
  channel: string;
  title: string;
  body?: string | null;
  isRead: boolean;
  createdAt: string;
};

export default function AdminNotificationsPage() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("panel");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/notifications", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setRows(data.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Can permission="notifications.manage">
          <AdminButton onClick={() => setOpen(true)}>اعلان جدید</AdminButton>
        </Can>
      </div>
      <DataTable
        columns={[
          {
            key: "title",
            header: "عنوان",
            render: (r) => (
              <div>
                <p className={r.isRead ? "text-stone-600" : "font-semibold text-stone-900"}>
                  {r.title}
                </p>
                <p className="text-xs text-stone-500">{r.body}</p>
              </div>
            ),
          },
          { key: "channel", header: "کانال", render: (r) => r.channel },
          {
            key: "actions",
            header: "عملیات",
            render: (r) =>
              !r.isRead ? (
                <button
                  type="button"
                  className="text-xs text-amber-800 hover:underline"
                  onClick={async () => {
                    await fetch("/api/admin/notifications", {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ id: r.id }),
                    });
                    await load();
                  }}
                >
                  خوانده شد
                </button>
              ) : (
                <span className="text-xs text-stone-400">خوانده‌شده</span>
              ),
          },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={load}
        searchable
        searchKeys={(r) => `${r.title} ${r.body ?? ""} ${r.channel}`}
      />

      <AdminModal
        open={open}
        onClose={() => setOpen(false)}
        title="اعلان جدید"
        footer={
          <AdminButton
            disabled={saving || !title}
            onClick={async () => {
              setSaving(true);
              try {
                const res = await fetch("/api/admin/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({ title, body, channel }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "خطا");
                toast.success("اعلان ثبت شد");
                setOpen(false);
                setTitle("");
                setBody("");
                await load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "خطا");
              } finally {
                setSaving(false);
              }
            }}
          >
            ارسال
          </AdminButton>
        }
      >
        <div className="space-y-3">
          <FormField label="عنوان" required>
            <AdminInput value={title} onChange={(e) => setTitle(e.target.value)} />
          </FormField>
          <FormField label="متن">
            <AdminTextarea value={body} onChange={(e) => setBody(e.target.value)} />
          </FormField>
          <FormField label="کانال">
            <AdminSelect value={channel} onChange={(e) => setChannel(e.target.value)}>
              <option value="panel">پنل</option>
              <option value="email">ایمیل</option>
              <option value="sms">پیامک</option>
            </AdminSelect>
          </FormField>
        </div>
      </AdminModal>
    </div>
  );
}
