"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SealCheck, Star } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReviewForm } from "@/components/sections/ReviewForm";
import { hajiasalPath } from "@/lib/paths";
import { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";
import type { Review } from "@/lib/server/reviews";
import { cn } from "@/lib/utils";

type Filter = "all" | "5" | "4";

interface ReviewItem extends Review {
  productTitle?: string;
  productSlug?: string;
}

interface ReviewsPageClientProps {
  reviews: ReviewItem[];
  averageRating: number;
  fiveStarShare: number;
}

function formatFaDate(date: string) {
  try {
    return new Date(date).toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date;
  }
}

export function ReviewsPageClient({
  reviews,
  averageRating,
  fiveStarShare,
}: ReviewsPageClientProps) {
  const [filter, setFilter] = useState<Filter>("all");
  const isEmpty = reviews.length === 0;

  const filtered = useMemo(() => {
    if (filter === "5") return reviews.filter((r) => r.rating === 5);
    if (filter === "4") return reviews.filter((r) => r.rating >= 4);
    return reviews;
  }, [filter, reviews]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "همه" },
    { id: "5", label: "۵ ستاره" },
    { id: "4", label: "۴ به بالا" },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 pb-20 pt-12 sm:px-6 md:px-8 md:pb-28 md:pt-20">
      <Reveal>
        <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-primary text-balance sm:text-4xl md:text-5xl">
          نظرات مشتریان
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-secondary md:text-base">
          تجربه خریداران حاجی عسل از عسل طبیعی تا خشکبار و گیاهان دارویی.
        </p>
      </Reveal>

      {!isEmpty ? (
        <Reveal delay={0.06}>
          <div className="mt-10 grid grid-cols-1 gap-3 sm:grid-cols-3 md:mt-12">
            <div className="rounded-2xl border border-border bg-surface px-5 py-5">
              <p className="font-display text-3xl text-gold tabular-nums">
                {averageRating.toLocaleString("fa-IR", {
                  minimumFractionDigits: 1,
                  maximumFractionDigits: 1,
                })}
              </p>
              <p className="mt-1 text-xs text-dim">میانگین از ۵</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-5 py-5">
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {reviews.length.toLocaleString("fa-IR")}
              </p>
              <p className="mt-1 text-xs text-dim">نظر تأییدشده</p>
            </div>
            <div className="rounded-2xl border border-border bg-surface px-5 py-5">
              <p className="text-2xl font-semibold text-primary tabular-nums">
                {Math.round(fiveStarShare).toLocaleString("fa-IR")}٪
              </p>
              <p className="mt-1 text-xs text-dim">رضایت ۵ ستاره</p>
            </div>
          </div>
        </Reveal>
      ) : null}

      {!isEmpty ? (
        <Reveal delay={0.1}>
          <div
            className="mt-8 flex flex-wrap gap-2"
            role="tablist"
            aria-label="فیلتر امتیاز"
          >
            {filters.map((item) => {
              const active = filter === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(item.id)}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-xs transition-colors md:text-[13px]",
                    active
                      ? "bg-gold text-ink-on-gold"
                      : "border border-border-bright bg-surface text-secondary hover:border-gold/40 hover:text-gold",
                  )}
                >
                  {item.label}
                </button>
              );
            })}
          </div>
        </Reveal>
      ) : null}

      {isEmpty ? (
        <div className="mt-12">
          <EmptyState
            title="هنوز نظر تأییدشده‌ای ثبت نشده"
            description="پس از خرید می‌توانید تجربه خود را بنویسید. نظرات پس از بررسی نمایش داده می‌شوند."
            action={
              <Button href={hajiasalPath("/shop")} size="lg">
                مشاهده فروشگاه
              </Button>
            }
          />
        </div>
      ) : filtered.length === 0 ? (
        <div className="mt-12">
          <EmptyState
            title="با این فیلتر نظری پیدا نشد"
            action={
              <button
                type="button"
                onClick={() => setFilter("all")}
                className="text-sm text-gold hover:text-gold-bright"
              >
                نمایش همه نظرات
              </button>
            }
          />
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 md:mt-10 md:grid-cols-2">
          {filtered.map((review, i) => (
            <Reveal key={review.id} delay={Math.min(i * 0.04, 0.2)}>
              <li className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 md:p-6">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <div className="flex items-center gap-0.5" aria-hidden>
                    {Array.from({ length: 5 }).map((_, star) => (
                      <Star
                        key={star}
                        size={13}
                        weight={star < review.rating ? "fill" : "regular"}
                        className={
                          star < review.rating ? "text-gold" : "text-star-empty"
                        }
                      />
                    ))}
                  </div>
                  <time
                    dateTime={review.date}
                    className="text-[11px] text-dim tabular-nums"
                  >
                    {formatFaDate(review.date)}
                  </time>
                </div>

                <blockquote className="flex-1 text-[0.95rem] leading-[1.9] text-secondary text-pretty">
                  {review.comment}
                </blockquote>

                {review.adminReply ? (
                  <div className="mt-4 rounded-xl bg-surface-muted/80 px-3 py-2.5 text-xs leading-relaxed text-secondary">
                    <p className="mb-1 font-medium text-primary">پاسخ فروشگاه</p>
                    <p>{review.adminReply}</p>
                  </div>
                ) : null}

                <footer className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-4">
                  <cite className="not-italic text-sm font-medium text-primary">
                    {review.author}
                  </cite>
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
                  {review.productTitle &&
                  review.productSlug &&
                  review.productId !== GENERAL_REVIEW_PRODUCT_ID ? (
                    <Link
                      href={hajiasalPath(`/product/${review.productSlug}`)}
                      className="text-[11px] text-gold transition-colors hover:text-gold-bright"
                    >
                      {review.productTitle}
                    </Link>
                  ) : null}
                </footer>
              </li>
            </Reveal>
          ))}
        </ul>
      )}

      <Reveal delay={0.1}>
        <div className="mt-14 rounded-2xl border border-border bg-surface px-5 py-10 md:mt-16 md:px-10 md:py-12">
          <ReviewForm compact />
          <div className="mt-8 flex justify-center">
            <Button href={hajiasalPath("/shop")} variant="outline" size="lg">
              مشاهده فروشگاه
            </Button>
          </div>
        </div>
      </Reveal>
    </div>
  );
}
