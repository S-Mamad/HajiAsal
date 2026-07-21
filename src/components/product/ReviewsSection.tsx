"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, SealCheck } from "@phosphor-icons/react";
import type { Product } from "@/types";
import type { Review } from "@/lib/server/reviews";
import { cn } from "@/lib/utils";

const schema = z.object({
  author: z.string().min(2, "نام را وارد کنید").max(40),
  phone: z
    .string()
    .min(10, "موبایل سفارش را وارد کنید")
    .max(15, "شماره نامعتبر است")
    .refine((v) => {
      const d = v.replace(/\D/g, "");
      return (
        (d.length === 11 && d.startsWith("09")) ||
        (d.length === 10 && d.startsWith("9"))
      );
    }, { message: "موبایل را با ۰۹ وارد کنید" }),
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "حداقل چند جمله بنویسید").max(400),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface ReviewsSectionProps {
  product: Product;
  initialReviews?: Review[];
}

const fieldClass =
  "w-full border-0 border-b border-border-bright bg-transparent py-3 text-sm text-primary outline-none transition-colors placeholder:text-dim/50 focus:border-gold/45";

export function ReviewsSection({
  product,
  initialReviews,
}: ReviewsSectionProps) {
  const [reviews, setReviews] = useState<Review[]>(initialReviews ?? []);
  const [loading, setLoading] = useState(initialReviews === undefined);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
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
      author: "",
      phone: "",
      rating: 5,
      comment: "",
      website: "",
    },
  });

  const rating = watch("rating");

  useEffect(() => {
    if (initialReviews !== undefined) return;
    fetch(`/api/reviews?productId=${product.id}`)
      .then((res) => res.json())
      .then((data) => setReviews(data.reviews ?? []))
      .finally(() => setLoading(false));
  }, [product.id, initialReviews]);

  const onSubmit = async (data: FormData) => {
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: data.author.trim(),
          phone: data.phone.trim(),
          rating: data.rating,
          comment: data.comment.trim(),
          productId: product.id,
          website: data.website ?? "",
        }),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        setStatus("error");
        setMessage(result.message ?? "ارسال نشد");
        return;
      }
      setStatus("done");
      setMessage(
        result.message ?? "ثبت شد. پس از تأیید ادمین نمایش داده می‌شود.",
      );
      reset({
        author: "",
        phone: "",
        rating: 5,
        comment: "",
        website: "",
      });
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
        <ul className="mb-12 flex flex-col">
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
        <p className="mb-12 text-sm text-dim">
          هنوز نظر تأییدشده‌ای برای این محصول نیست.
        </p>
      )}

      <div className="max-w-md">
        <h3 className="mb-1 text-base font-medium text-primary">
          نظر شما درباره این محصول
        </h3>
        <p className="mb-6 text-[13px] leading-relaxed text-secondary">
          فرم برای همه باز است. ارسال فقط برای خریداران است و پس از تأیید ادمین
          نمایش داده می‌شود.
        </p>

        {status === "done" ? (
          <div className="py-6">
            <p className="text-sm text-secondary">{message}</p>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setMessage("");
              }}
              className="mt-4 text-xs text-gold hover:text-gold-bright"
            >
              نوشتن نظر دیگر
            </button>
          </div>
        ) : (
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

            <div className="mb-6">
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

            <label className="mb-5 block">
              <span className="mb-1 block text-[11px] text-dim">نام نمایشی</span>
              <input
                type="text"
                autoComplete="name"
                placeholder="مثلاً مریم"
                className={fieldClass}
                {...register("author")}
              />
              {errors.author ? (
                <p className="mt-1.5 text-[11px] text-red-400/90">
                  {errors.author.message}
                </p>
              ) : null}
            </label>

            <label className="mb-5 block">
              <span className="mb-1 block text-[11px] text-dim">
                موبایل ثبت‌شده در سفارش
              </span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                dir="ltr"
                placeholder="09xxxxxxxxx"
                className={cn(fieldClass, "text-left")}
                {...register("phone")}
              />
              {errors.phone ? (
                <p className="mt-1.5 text-[11px] text-red-400/90">
                  {errors.phone.message}
                </p>
              ) : (
                <p className="mt-1.5 text-[11px] text-dim/80">
                  فقط با شماره خریدار، نظر به ادمین ارسال می‌شود
                </p>
              )}
            </label>

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

            <div className="mt-7">
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
          </form>
        )}
      </div>
    </section>
  );
}
