"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

type Review = {
  id: string;
  productTitle: string;
  rating: number;
  comment: string;
  sellerReply?: string;
};

export default function SellerReviewsPage() {
  const router = useRouter();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [replyMap, setReplyMap] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/reviews");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const data = await res.json();
    setReviews(data.reviews ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const reply = async (id: string) => {
    await fetch("/api/seller/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: id, reply: replyMap[id] ?? "" }),
    });
    await load();
  };

  const report = async (id: string) => {
    const note = window.prompt("دلیل گزارش به ادمین؟");
    if (!note) return;
    await fetch("/api/seller/reviews", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reviewId: id, reportNote: note }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {reviews.length === 0 ? (
        <p className="text-sm text-stone-500">نظری ثبت نشده</p>
      ) : (
        reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="font-medium">{r.productTitle}</p>
            <p className="text-sm text-amber-800">امتیاز {r.rating}</p>
            <p className="mt-2 text-sm text-stone-700">{r.comment}</p>
            {r.sellerReply ? (
              <p className="mt-2 rounded-lg bg-stone-50 p-2 text-sm">پاسخ شما: {r.sellerReply}</p>
            ) : (
              <div className="mt-3 flex flex-wrap gap-2">
                <input
                  className="min-w-[200px] flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  placeholder="پاسخ..."
                  value={replyMap[r.id] ?? ""}
                  onChange={(e) =>
                    setReplyMap((m) => ({ ...m, [r.id]: e.target.value }))
                  }
                />
                <AdminButton onClick={() => void reply(r.id)}>ثبت پاسخ</AdminButton>
                <AdminButton variant="outline" onClick={() => void report(r.id)}>
                  گزارش
                </AdminButton>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
