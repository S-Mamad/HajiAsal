"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, SealCheck } from "@phosphor-icons/react";
import type { Review } from "@/lib/server/reviews";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import type { ReviewsSectionProps } from "../types";

const schema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "حداقل چند جمله بنویسید").max(400),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

type ComposerMode = "closed" | "login" | "purchase" | "form" | "done";

const fieldClass =
  "w-full border-0 border-b border-border-bright bg-transparent py-3 text-sm text-primary outline-none transition-colors placeholder:text-dim/50 focus:border-gold/45";

export function ReviewsSection({
  product,
  initialReviews,
}: ReviewsSectionProps) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [composer, setComposer] = useState<ComposerMode>("closed");
  const [checking, setChecking] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      rating: 5,
      comment: "",
      website: "",
    },
  });

  const rating = watch("rating");
  const productPath = hajiasalPath(`/product/${product.slug}`);
  const loginHref = `${hajiasalPath("/login")}?redirect=${encodeURIComponent(productPath)}`;

  useEffect(() => {
    if (initialReviews !== undefined) return;
    fetch(`/api/reviews?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews ?? []))
      .finally(() => setLoading(false));
  }, [product.id, initialReviews]);

  const openComposer = async () => {
    if (authLoading || checking) return;
    setMessage("");
    setStatus("idle");

    if (!isLoggedIn) {
      setComposer("login");
      return;
    }

    setChecking(true);
    try {
      const res = await fetch(
        `/api/reviews/eligibility?productId=${encodeURIComponent(product.id)}`,
      );
      const data = (await res.json()) as {
        canReview?: boolean;
        reason?: "login" | "purchase" | "ok";
      };

      if (!res.ok || data.reason === "login" || !isLoggedIn) {
        setComposer("login");
        return;
      }
      if (!data.canReview || data.reason === "purchase") {
        setComposer("purchase");
        return;
      }

      reset({ rating: 5, comment: "", website: "" });
      setComposer("form");
    } catch {
      setComposer("purchase");
      setMessage("بررسی واجد شرایط بودن ممکن نشد. دوباره تلاش کنید.");
    } finally {
      setChecking(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    if (status === "loading" || !user) return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: (user.fullName || "خریدار").trim(),
          phone: user.phone.trim(),
          rating: data.rating,
          comment: data.comment.trim(),
          productId: product.id,
          website: data.website ?? "",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        if (res.status === 401) {
          setComposer("login");
          setStatus("idle");
          return;
        }
        if (res.status === 403) {
          setComposer("purchase");
          setStatus("idle");
          setMessage(result.message ?? "");
          return;
        }
        setStatus("error");
        setMessage(result.message ?? "ارسال نشد");
        return;
      }
      setComposer("done");
      setStatus("idle");
      setMessage(
        result.message ?? "ثبت شد. پس از تأیید ادمین نمایش داده می‌شود.",
      );
      reset({ rating: 5, comment: "", website: "" });
    } catch {
      setStatus("error");
      setMessage("ارتباط برقرار نشد.");
    }
  };

  return (
    <section className="mt-14 border-t border-border pt-10 md:mt-20 md:pt-14">
      <div className="mb-8 md:mb-10">
        <p className="mb-2 text-[10px] font-medium tracking-[0.2em] text-gold">
          نظرات
        </p>
        <h2 className="font-display text-xl text-primary md:text-2xl">
          نظرات مشتریان
        </h2>
        <p className="mt-1.5 text-sm text-secondary">
          {reviews.length.toLocaleString("fa-IR")} نظر تأییدشده برای{" "}
          {product.title}
        </p>
      </div>

      {loading ? (
        <p className="mb-10 text-sm text-dim">در حال بارگذاری...</p>
      ) : reviews.length > 0 ? (
        <ul className="mb-10 flex flex-col md:mb-12">
          {reviews.map((review) => (
            <li
              key={review.id}
              className="border-b border-border py-6 last:border-0"
            >
              <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                <div className="flex items-center gap-0.5" aria-hidden>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      size={12}
                      weight={i < review.rating ? "fill" : "regular"}
                      className={
                        i < review.rating ? "text-gold" : "text-star-empty"
                      }
                    />
                  ))}
                </div>
                <time
                  className="text-[11px] text-dim tabular-nums"
                  dateTime={review.date}
                >
                  {new Date(review.date).toLocaleDateString("fa-IR")}
                </time>
              </div>
              <p className="text-sm leading-relaxed text-secondary">
                {review.comment}
              </p>
              {review.adminReply ? (
                <div className="mt-3 rounded-xl bg-surface-muted/80 px-3 py-2.5 text-xs leading-relaxed text-secondary">
                  <p className="mb-1 font-medium text-primary">پاسخ فروشگاه</p>
                  <p>{review.adminReply}</p>
                </div>
              ) : null}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-primary">
                  {review.author}
                </span>
                {review.verified ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-dim">
                    <SealCheck
                      size={12}
                      weight="fill"
                      className="text-gold/65"
                    />
                    خرید تأییدشده
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-10 text-sm text-dim md:mb-12">
          هنوز نظر تأییدشده‌ای برای این محصول نیست.
        </p>
      )}

      <div className="max-w-md">
        {composer === "closed" ? (
          <button
            type="button"
            onClick={() => void openComposer()}
            disabled={authLoading || checking}
            className="text-sm text-gold transition-opacity hover:text-gold-bright disabled:opacity-50"
          >
            {checking ? "در حال بررسی..." : "نوشتن نظر"}
          </button>
        ) : null}

        {composer === "login" ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-secondary">
              برای ثبت نظر ابتدا وارد حساب کاربری شوید.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={loginHref}
                className="text-sm text-gold hover:text-gold-bright"
              >
                ورود / ثبت‌نام
              </Link>
              <button
                type="button"
                onClick={() => setComposer("closed")}
                className="text-xs text-dim hover:text-secondary"
              >
                بستن
              </button>
            </div>
          </div>
        ) : null}

        {composer === "purchase" ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-secondary" role="status">
              {message || "برای ثبت نظر باید ابتدا این محصول را بخرید."}
            </p>
            <button
              type="button"
              onClick={() => {
                setComposer("closed");
                setMessage("");
              }}
              className="text-xs text-dim hover:text-secondary"
            >
              بستن
            </button>
          </div>
        ) : null}

        {composer === "done" ? (
          <div className="space-y-3">
            <p className="text-sm leading-relaxed text-secondary">{message}</p>
            <button
              type="button"
              onClick={() => {
                setComposer("closed");
                setMessage("");
              }}
              className="text-xs text-gold hover:text-gold-bright"
            >
              نوشتن نظر دیگر
            </button>
          </div>
        ) : null}

        {composer === "form" ? (
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="relative"
            noValidate
          >
            <div
              className="pointer-events-none absolute -left-[9999px] opacity-0"
              aria-hidden
            >
              <input tabIndex={-1} autoComplete="off" {...register("website")} />
            </div>

            <div className="mb-1 flex items-center justify-between gap-3">
              <p className="text-[11px] text-dim">
                ثبت به‌نام {user?.fullName || "شما"}
              </p>
              <button
                type="button"
                onClick={() => {
                  setComposer("closed");
                  setStatus("idle");
                  setMessage("");
                }}
                className="text-[11px] text-dim hover:text-secondary"
              >
                انصراف
              </button>
            </div>

            <div className="mb-5 mt-4">
              <p className="mb-2 text-[11px] text-dim">امتیاز شما</p>
              <div
                className="flex items-center gap-1"
                role="radiogroup"
                aria-label="امتیاز"
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={rating === value}
                    aria-label={`${value} از ۵`}
                    onClick={() =>
                      setValue("rating", value, { shouldValidate: true })
                    }
                    className="flex h-8 w-8 items-center justify-center touch-manipulation"
                  >
                    <Star
                      size={18}
                      weight={value <= rating ? "fill" : "regular"}
                      className={
                        value <= rating ? "text-gold" : "text-star-empty"
                      }
                    />
                  </button>
                ))}
              </div>
            </div>

            <label className="mb-2 block">
              <span className="mb-1 block text-[11px] text-dim">متن نظر</span>
              <textarea
                rows={3}
                maxLength={400}
                placeholder="از کیفیت، طعم یا ارسال بگویید..."
                className={cn(fieldClass, "resize-none leading-relaxed")}
                {...register("comment")}
              />
              {errors.comment ? (
                <p className="mt-1.5 text-[11px] text-red-400/90">
                  {errors.comment.message}
                </p>
              ) : null}
            </label>

            <div className="mt-6">
              <button
                type="submit"
                disabled={status === "loading"}
                className="text-sm text-gold transition-opacity hover:text-gold-bright disabled:opacity-50"
              >
                {status === "loading" ? "در حال ارسال..." : "ارسال برای تأیید"}
              </button>
            </div>

            {status === "error" && message ? (
              <p
                className="mt-4 text-[12px] leading-relaxed text-red-400"
                role="alert"
              >
                {message}
              </p>
            ) : null}

            <p className="mt-3 text-[11px] text-dim">
              نظر پس از بررسی ادمین منتشر می‌شود.
            </p>
          </form>
        ) : null}
      </div>
    </section>
  );
}
