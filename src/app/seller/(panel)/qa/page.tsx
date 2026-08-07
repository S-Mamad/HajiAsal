"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

type Q = {
  id: string;
  productTitle: string;
  question: string;
  answer?: string;
};

export default function SellerQaPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/seller/qa");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "خطا در بارگذاری پرسش‌ها");
      setQuestions([]);
      setLoading(false);
      return;
    }
    setError("");
    setQuestions(data.questions ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const answer = async (id: string) => {
    const text = (answers[id] ?? "").trim();
    if (!text) {
      setError("متن پاسخ را وارد کنید");
      return;
    }
    setBusyId(id);
    setError("");
    try {
      const res = await fetch("/api/seller/qa", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: id, answer: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "ثبت پاسخ ناموفق بود");
      setAnswers((m) => {
        const next = { ...m };
        delete next[id];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-4">
      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {error}
        </p>
      ) : null}
      {loading ? (
        <div className="space-y-3" aria-busy>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--panel-radius)] bg-zinc-100"
            />
          ))}
        </div>
      ) : questions.length === 0 ? (
        <p className="rounded-[var(--panel-radius)] border border-dashed border-[var(--panel-border)] px-4 py-12 text-center text-sm text-zinc-500">
          پرسشی برای پاسخ نیست
        </p>
      ) : (
        questions.map((q) => (
          <div
            key={q.id}
            className="rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-white p-4"
          >
            <p className="text-xs text-zinc-500">{q.productTitle}</p>
            <p className="mt-1 font-medium text-zinc-900">{q.question}</p>
            {q.answer ? (
              <p className="mt-2 text-sm text-zinc-600">پاسخ: {q.answer}</p>
            ) : (
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <input
                  className="flex-1 rounded-[var(--panel-radius-sm)] border border-[var(--panel-border)] px-3 py-2 text-sm outline-none transition focus:border-zinc-400"
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((m) => ({ ...m, [q.id]: e.target.value }))
                  }
                  placeholder="پاسخ..."
                />
                <AdminButton
                  onClick={() => void answer(q.id)}
                  disabled={busyId === q.id || !(answers[q.id] ?? "").trim()}
                >
                  ثبت
                </AdminButton>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
