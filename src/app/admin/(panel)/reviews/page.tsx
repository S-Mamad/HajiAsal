"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";
import type { Review } from "@/lib/server/reviews";
import { hajiasalPath } from "@/lib/paths";

export default function AdminReviewsPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [replying, setReplying] = useState<Review | null>(null);
  const [reply, setReply] = useState("");
  const [saving, setSaving] = useState(false);

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/reviews", { credentials: "include" });
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setReviews(data.reviews ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const moderate = async (
    review: Review,
    patch: { approved?: boolean; adminReply?: string },
  ) => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ id: review.id, ...patch }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در به‌روزرسانی");
      setReviews((prev) =>
        prev.map((r) => (r.id === review.id ? { ...r, ...data.review } : r)),
      );
      toast.success("به‌روز شد");
      setReplying(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        data={reviews}
        rowKey={(row) => row.id}
        loading={loading}
        error={error}
        onRetry={loadReviews}
        emptyMessage="نظری ثبت نشده است"
        searchable
        searchKeys={(row) =>
          `${row.author} ${row.comment} ${row.productId}`
        }
        columns={[
          {
            key: "author",
            header: "نویسنده",
            render: (row) => row.author,
          },
          {
            key: "product",
            header: "محصول",
            hideOnMobile: true,
            render: (row) =>
              row.productId === "general" ? "تجربه کلی" : row.productId,
          },
          {
            key: "rating",
            header: "امتیاز",
            render: (row) => `${row.rating.toLocaleString("fa-IR")} / ۵`,
          },
          {
            key: "comment",
            header: "متن",
            render: (row) => (
              <p className="max-w-xs truncate text-stone-600">{row.comment}</p>
            ),
          },
          {
            key: "status",
            header: "وضعیت",
            render: (row) => (
              <Can permission="reviews.moderate">
                <div className="flex flex-wrap gap-1">
                  <AdminButton
                    type="button"
                    variant={row.verified ? "outline" : "primary"}
                    size="sm"
                    onClick={() =>
                      void moderate(row, { approved: !row.verified })
                    }
                  >
                    {row.verified ? "لغو تأیید" : "تأیید"}
                  </AdminButton>
                  <AdminButton
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setReplying(row);
                      setReply("");
                    }}
                  >
                    پاسخ
                  </AdminButton>
                </div>
              </Can>
            ),
          },
        ]}
      />

      <AdminModal
        open={Boolean(replying)}
        onClose={() => setReplying(null)}
        title="پاسخ به نظر"
        footer={
          <AdminButton
            disabled={saving || !reply.trim()}
            onClick={() =>
              replying
                ? void moderate(replying, { adminReply: reply.trim() })
                : undefined
            }
          >
            ثبت پاسخ
          </AdminButton>
        }
      >
        <p className="mb-3 text-sm text-stone-600">{replying?.comment}</p>
        <FormField label="پاسخ مدیر" required>
          <AdminTextarea value={reply} onChange={(e) => setReply(e.target.value)} />
        </FormField>
      </AdminModal>
    </div>
  );
}
