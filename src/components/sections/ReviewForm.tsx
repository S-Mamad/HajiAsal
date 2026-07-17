"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { hajiasalPath } from "@/lib/paths";
import { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";

const schema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().min(10, "حداقل چند جمله بنویسید").max(400),
  website: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

export function ReviewForm({ compact = false }: { compact?: boolean }) {
  const { user, isLoggedIn, loading: authLoading } = useAuth();
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
      rating: 5,
      comment: "",
      website: "",
    },
  });

  const rating = watch("rating");

  useEffect(() => {
    if (isLoggedIn) {
      reset({ rating: 5, comment: "", website: "" });
    }
  }, [isLoggedIn, reset]);

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
          productId: GENERAL_REVIEW_PRODUCT_ID,
          comment: data.comment.trim(),
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
      reset({ rating: 5, comment: "", website: "" });
    } catch {
      setStatus("error");
      setMessage("ارتباط برقرار نشد.");
    }
  };

  const loginHref = `${hajiasalPath("/login")}?redirect=${encodeURIComponent(hajiasalPath("/reviews"))}`;

  return (
    <section className={cn(compact ? "py-0" : "pb-16 pt-4 md:pb-24 md:pt-6")}>
      <div className={cn("mx-auto px-5 md:px-8", compact ? "max-w-none px-0" : "max-w-lg")}>
        <Reveal>
          <div className={cn("text-center", compact ? "mb-6" : "mb-8 md:mb-10")}>
            <p className="mb-2 text-[10px] font-medium tracking-[0.2em] text-gold">
              صدای شما
            </p>
            <h2 className="font-display text-xl text-primary md:text-2xl">
              تجربه‌تان را بنویسید
            </h2>
          </div>

          {authLoading ? (
            <p className="py-8 text-center text-sm text-dim">در حال بررسی ورود...</p>
          ) : !isLoggedIn ? (
            <div className="rounded-2xl border border-border bg-surface/60 px-6 py-10 text-center">
              <p className="mx-auto max-w-xs text-sm leading-relaxed text-secondary">
                برای ثبت نظر وارد حساب شوید تا نام و موبایل‌تان خودکار پر شود.
              </p>
              <Button href={loginHref} className="mt-6">
                ورود / ثبت‌نام
              </Button>
            </div>
          ) : status === "done" ? (
            <div className="py-10 text-center">
              <p className="text-sm leading-relaxed text-secondary">{message}</p>
              <button
                type="button"
                onClick={() => {
                  setStatus("idle");
                  setMessage("");
                }}
                className="mt-5 text-xs text-gold hover:text-gold-bright"
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
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  {...register("website")}
                />
              </div>

              <p className="mb-6 text-center text-xs text-dim">
                ثبت به‌نام {user?.fullName || "شما"}
              </p>

              <div className="mb-8">
                <div
                  className="flex items-center justify-center gap-2"
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
                      className="flex h-11 w-11 items-center justify-center touch-manipulation transition-transform active:scale-95"
                    >
                      <Star
                        size={26}
                        weight={value <= rating ? "fill" : "regular"}
                        className={
                          value <= rating ? "text-gold" : "text-star-empty"
                        }
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="block">
                <span className="sr-only">متن نظر</span>
                <textarea
                  rows={4}
                  maxLength={400}
                  placeholder="از طعم، کیفیت یا ارسال بگویید..."
                  className="w-full resize-none rounded-2xl border border-border bg-surface px-5 py-4 text-sm leading-relaxed text-primary outline-none transition-colors placeholder:text-dim/50 focus:border-gold/40"
                  {...register("comment")}
                />
                {errors.comment ? (
                  <p className="mt-2 text-[11px] text-red-400/90">
                    {errors.comment.message}
                  </p>
                ) : null}
              </label>

              <div className="mt-6 flex justify-center">
                <Button type="submit" disabled={status === "loading"}>
                  {status === "loading" ? "در حال ارسال..." : "ارسال نظر"}
                </Button>
              </div>

              {status === "error" && message ? (
                <p
                  className="mt-5 text-center text-[12px] leading-relaxed text-red-400"
                  role="alert"
                >
                  {message}
                </p>
              ) : null}

              <p className="mt-4 text-center text-[11px] text-dim">
                نظر پس از بررسی ادمین منتشر می‌شود.{" "}
                <Link href={hajiasalPath("/shop")} className="text-gold/80 hover:text-gold">
                  ادامه خرید
                </Link>
              </p>
            </form>
          )}
        </Reveal>
      </div>
    </section>
  );
}
