"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminModal } from "@/components/admin/ui/AdminModal";
import { hajiasalPath } from "@/lib/paths";

type AppStatus = "pending" | "approved" | "rejected";

interface Application {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  address: string;
  bankCard: string;
  productsIntro: string;
  nationalIdFrontUrl: string;
  nationalIdBackUrl?: string | null;
  commitmentLetterUrl: string;
  status: AppStatus;
  termsAcceptedAt: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  sellerId?: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<AppStatus, string> = {
  pending: "در انتظار",
  approved: "تأیید شده",
  rejected: "رد شده",
};

export default function AdminSellerApplicationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState("");
  const [shopName, setShopName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/seller-applications/${id}`);
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا");
      setApp(data.application);
      if (data.application?.fullName) {
        setShopName(`فروشگاه ${data.application.fullName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    void load();
  }, [load]);

  const approve = async () => {
    if (!app) return;
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/seller-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "approve",
          shopName: shopName.trim() || undefined,
          reviewNote: reviewNote.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "تأیید ناموفق بود");
      setApp(data.application);
      setReviewNote("");
      // Stay on this page — admin decides next; no forced redirect.
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setActing(false);
    }
  };

  const reject = async () => {
    if (!app) return;
    if (!reviewNote.trim()) {
      setError("یادداشت رد الزامی است");
      return;
    }
    setActing(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/seller-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reject",
          reviewNote: reviewNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "رد ناموفق بود");
      setApp(data.application);
      setRejectOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setActing(false);
    }
  };

  if (loading) {
    return (
      <p className="text-sm text-zinc-500" dir="rtl">
        در حال بارگذاری...
      </p>
    );
  }

  if (!app) {
    return (
      <div dir="rtl" className="space-y-3">
        <p className="text-sm text-red-600">{error || "درخواست یافت نشد"}</p>
        <Link
          href={hajiasalPath("/admin/seller-applications")}
          className="text-sm text-amber-800 hover:underline"
        >
          بازگشت به لیست
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6" dir="rtl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href={hajiasalPath("/admin/seller-applications")}
            className="text-xs text-zinc-400 hover:text-zinc-600"
          >
            ← درخواست‌ها
          </Link>
          <h1 className="mt-2 text-xl font-semibold text-zinc-900">
            {app.fullName}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {STATUS_LABELS[app.status]} ·{" "}
            {new Date(app.createdAt).toLocaleDateString("fa-IR")}
          </p>
        </div>
        {app.sellerId ? (
          <Link
            href={hajiasalPath(`/admin/sellers/${app.sellerId}`)}
            className="text-sm text-amber-800 hover:underline"
          >
            مشاهده فروشنده
          </Link>
        ) : null}
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {app.status === "approved" ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          درخواست تأیید شد و حساب فروشنده ساخته شد.
          {app.sellerId ? (
            <>
              {" "}
              <Link
                href={hajiasalPath(`/admin/sellers/${app.sellerId}`)}
                className="font-medium underline underline-offset-2"
              >
                مشاهده فروشنده
              </Link>
            </>
          ) : null}
        </div>
      ) : null}

      {app.status === "rejected" ? (
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
          این درخواست رد شده است.
        </div>
      ) : null}

      <section className="grid gap-4 rounded-xl border border-zinc-200 bg-white p-5 sm:grid-cols-2">
        <Field label="موبایل" value={app.phone} ltr />
        <Field label="کد ملی" value={app.nationalId} ltr />
        <Field label="تاریخ تولد" value={app.birthDate} ltr />
        <Field label="شماره کارت" value={app.bankCard} ltr />
        <div className="sm:col-span-2">
          <Field label="آدرس" value={app.address} />
        </div>
        <div className="sm:col-span-2">
          <Field label="معرفی محصولات" value={app.productsIntro} />
        </div>
      </section>

      <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-zinc-900">مدارک</h2>
        <DocLink label="کارت ملی (رو)" url={app.nationalIdFrontUrl} />
        {app.nationalIdBackUrl ? (
          <DocLink label="کارت ملی (پشت)" url={app.nationalIdBackUrl} />
        ) : null}
        <DocLink label="تعهدنامه" url={app.commitmentLetterUrl} />
      </section>

      {app.reviewNote ? (
        <section className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
          <p className="font-medium text-zinc-800">یادداشت بررسی</p>
          <p className="mt-1">{app.reviewNote}</p>
        </section>
      ) : null}

      {app.status === "pending" ? (
        <section className="space-y-3 rounded-xl border border-zinc-200 bg-white p-5">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            نام فروشگاه (پس از تأیید)
            <input
              value={shopName}
              onChange={(e) => setShopName(e.target.value)}
              className="h-10 rounded-lg border border-zinc-200 px-3 text-sm outline-none focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/15"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium text-zinc-700">
            یادداشت (اختیاری برای تأیید)
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              rows={2}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/15"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <AdminButton
              type="button"
              disabled={acting}
              onClick={() => void approve()}
            >
              {acting ? "..." : "تأیید و ایجاد فروشنده"}
            </AdminButton>
            <AdminButton
              type="button"
              variant="outline"
              disabled={acting}
              onClick={() => {
                setReviewNote("");
                setRejectOpen(true);
              }}
            >
              رد درخواست
            </AdminButton>
          </div>
        </section>
      ) : null}

      <AdminModal
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="رد درخواست"
      >
        <div className="space-y-3" dir="rtl">
          <p className="text-sm text-zinc-500">
            دلیل رد را بنویسید؛ این یادداشت ذخیره می‌شود.
          </p>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
            placeholder="دلیل رد..."
          />
          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="outline"
              onClick={() => setRejectOpen(false)}
            >
              انصراف
            </AdminButton>
            <AdminButton
              type="button"
              disabled={acting || !reviewNote.trim()}
              onClick={() => void reject()}
            >
              تأیید رد
            </AdminButton>
          </div>
        </div>
      </AdminModal>
    </div>
  );
}

function Field({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-zinc-400">{label}</p>
      <p
        className="mt-0.5 text-sm text-zinc-800"
        dir={ltr ? "ltr" : undefined}
      >
        {value || "—"}
      </p>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string }) {
  const isImage = /\.(jpe?g|png|webp|gif)$/i.test(url);
  return (
    <div className="flex flex-col gap-2">
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-amber-800 hover:underline"
      >
        {label}
      </a>
      {isImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={label}
          className="max-h-48 max-w-full rounded-lg border border-zinc-100 object-contain"
        />
      ) : null}
    </div>
  );
}
