"use client";

import { useCallback, useEffect, useState } from "react";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { StatusBadge } from "@/components/admin/ui/StatusBadge";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";

type Qa = {
  id: string;
  productId: string;
  askerName?: string | null;
  question: string;
  answer?: string | null;
  status: string;
  createdAt: string;
};

export default function AdminQaPage() {
  const toast = useAdminToast();
  const [rows, setRows] = useState<Qa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Qa | null>(null);
  const [answer, setAnswer] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/qa", { credentials: "include" });
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
      <DataTable
        columns={[
          {
            key: "question",
            header: "سؤال",
            render: (r) => (
              <div>
                <p className="font-medium text-stone-800">{r.question}</p>
                <p className="text-xs text-stone-500">
                  {r.askerName || "کاربر"} · {r.productId}
                </p>
              </div>
            ),
          },
          {
            key: "status",
            header: "وضعیت",
            render: (r) => <StatusBadge status={r.status} />,
          },
          {
            key: "actions",
            header: "عملیات",
            render: (r) => (
              <Can permission="qa.manage">
                <button
                  type="button"
                  className="text-xs text-amber-800 hover:underline"
                  onClick={() => {
                    setEditing(r);
                    setAnswer(r.answer ?? "");
                  }}
                >
                  پاسخ
                </button>
              </Can>
            ),
          },
        ]}
        data={rows}
        rowKey={(r) => r.id}
        loading={loading}
        error={error}
        onRetry={load}
        searchable
        searchKeys={(r) => `${r.question} ${r.askerName ?? ""} ${r.productId}`}
        emptyMessage="پرسشی ثبت نشده"
      />

      <AdminModal
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="پاسخ به پرسش"
        footer={
          <AdminButton
            disabled={saving || !answer.trim()}
            onClick={async () => {
              if (!editing) return;
              setSaving(true);
              try {
                const res = await fetch("/api/admin/qa", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    id: editing.id,
                    answer,
                    status: "answered",
                  }),
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error ?? "خطا");
                toast.success("پاسخ ثبت شد");
                setEditing(null);
                await load();
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "خطا");
              } finally {
                setSaving(false);
              }
            }}
          >
            ذخیره پاسخ
          </AdminButton>
        }
      >
        <p className="mb-3 text-sm text-stone-600">{editing?.question}</p>
        <FormField label="پاسخ" required>
          <AdminTextarea value={answer} onChange={(e) => setAnswer(e.target.value)} />
        </FormField>
      </AdminModal>
    </div>
  );
}
