"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataTable } from "@/components/admin/ui/DataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { Review } from "@/lib/server/reviews";
import { hajiasalPath } from "@/lib/paths";

export default function AdminReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadReviews = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/reviews");
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

  const toggleApproved = async (review: Review) => {
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: review.id, approved: !review.verified }),
      });
      if (!res.ok) throw new Error("خطا در به‌روزرسانی");
      setReviews((prev) =>
        prev.map((r) =>
          r.id === review.id ? { ...r, verified: !r.verified } : r,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          {reviews.length.toLocaleString("fa-IR")} نظر
        </p>
        <AdminButton type="button" variant="outline" onClick={() => void loadReviews()}>
          بروزرسانی
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      <DataTable
        data={reviews}
        rowKey={(row) => row.id}
        emptyMessage="نظری ثبت نشده است"
        columns={[
          {
            key: "author",
            header: "نویسنده",
            render: (row) => row.author,
          },
          {
            key: "product",
            header: "محصول",
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
              <p className="max-w-xs truncate text-slate-600">{row.comment}</p>
            ),
          },
          {
            key: "date",
            header: "تاریخ",
            render: (row) => new Date(row.date).toLocaleDateString("fa-IR"),
          },
          {
            key: "status",
            header: "وضعیت",
            render: (row) => (
              <AdminButton
                type="button"
                variant={row.verified ? "outline" : "primary"}
                size="sm"
                onClick={() => void toggleApproved(row)}
              >
                {row.verified ? "لغو تأیید" : "تأیید"}
              </AdminButton>
            ),
          },
        ]}
      />
    </div>
  );
}
