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

  const load = useCallback(async () => {
    const res = await fetch("/api/seller/qa");
    if (res.status === 401) {
      router.push(hajiasalPath("/seller"));
      return;
    }
    const data = await res.json();
    setQuestions(data.questions ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const answer = async (id: string) => {
    await fetch("/api/seller/qa", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionId: id, answer: answers[id] ?? "" }),
    });
    await load();
  };

  return (
    <div className="space-y-4">
      {questions.length === 0 ? (
        <p className="text-sm text-stone-500">سؤالی نیست</p>
      ) : (
        questions.map((q) => (
          <div key={q.id} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-xs text-stone-500">{q.productTitle}</p>
            <p className="mt-1 font-medium">{q.question}</p>
            {q.answer ? (
              <p className="mt-2 text-sm text-stone-600">پاسخ: {q.answer}</p>
            ) : (
              <div className="mt-3 flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-stone-200 px-3 py-2 text-sm"
                  value={answers[q.id] ?? ""}
                  onChange={(e) =>
                    setAnswers((m) => ({ ...m, [q.id]: e.target.value }))
                  }
                  placeholder="پاسخ..."
                />
                <AdminButton onClick={() => void answer(q.id)}>ثبت</AdminButton>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
