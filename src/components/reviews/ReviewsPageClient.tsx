"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SealCheck, Star } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { ReviewForm } from "@/components/sections/ReviewForm";
import { hajiasalPath } from "@/lib/paths";
import { GENERAL_REVIEW_PRODUCT_ID } from "@/lib/review-constants";
import type { Review } from "@/lib/server/reviews";

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

const SAMPLE_REVIEWS: ReviewItem[] = [
  {
    id: "sample-1",
    productId: GENERAL_REVIEW_PRODUCT_ID,
    author: "مریم ر.",
    rating: 5,
    comment:
      "عسل گون را برای خانواده خریدم. طعمش طبیعی و غلیظ است و بسته‌بندی هم خیلی مرتب رسید.",
    date: "2026-05-12",
    verified: true,
  },
  {
    id: "sample-2",
    productId: GENERAL_REVIEW_PRODUCT_ID,
    author: "حسین الف.",
    rating: 5,
    comment:
      "از یزد سفارش دادم و دو روزه آمد. کیفیت عسل کوهستان عالی بود و پشتیبانی هم پاسخگو بود.",
    date: "2026-04-28",
    verified: true,
  },
  {
    id: "sample-3",
    productId: GENERAL_REVIEW_PRODUCT_ID,
    author: "سارا م.",
    rating: 4,
    comment:
      "خشکبار و دمنوش هم گرفتم. همه‌چیز تازه بود. فقط کاش گزینه‌های وزن بیشتری داشته باشد.",
    date: "2026-03-18",
    verified: true,
  },
  {
    id: "sample-4",
    productId: GENERAL_REVIEW_PRODUCT_ID,
    author: "علی ن.",
    rating: 5,
    comment:
      "چند سال است مشتری حاجی عسل هستم. همیشه اصالت محصول برایم مهم بوده و هنوز هم همان کیفیت را می‌بینم.",
    date: "2026-02-02",
    verified: true,
  },
];

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
  const displayReviews = reviews.length > 0 ? reviews : SAMPLE_REVIEWS;
  const usingSamples = reviews.length === 0;

  const displayAverage = usingSamples
    ? SAMPLE_REVIEWS.reduce((s, r) => s + r.rating, 0) / SAMPLE_REVIEWS.length
    : averageRating;
  const displayFiveStarShare = usingSamples
    ? (SAMPLE_REVIEWS.filter((r) => r.rating === 5).length /
        SAMPLE_REVIEWS.length) *
      100
    : fiveStarShare;

  const filtered = useMemo(() => {
    if (filter === "5") return displayReviews.filter((r) => r.rating === 5);
    if (filter === "4") return displayReviews.filter((r) => r.rating >= 4);
    return displayReviews;
  }, [filter, displayReviews]);

  const filters: Array<{ id: Filter; label: string }> = [
    { id: "all", label: "همه" },
    { id: "5", label: "۵ ستاره" },
    { id: "4", label: "۴ به بالا" },
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-14 sm:px-6 md:px-8 md:pb-28 md:pt-24">
      <Reveal>
        <p className="mb-3 text-[11px] font-medium tracking-[0.2em] text-gold">
          صدای مشتریان
        </p>
        <h1 className="font-display text-[1.75rem] leading-tight tracking-tight text-primary text-balance sm:text-4xl md:text-5xl">
          نظرات مشتریان
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-secondary md:mt-4 md:text-base">
          تجربه خریداران حاجی عسل از عسل طبیعی تا خشکبار و گیاهان دارویی.
        </p>
      </Reveal>

      <Reveal delay={0.08}>
        <div className="mt-10 grid grid-cols-3 gap-4 border-y border-border py-7 md:mt-14 md:gap-8 md:py-10">
          <div>
            <p className="font-display text-3xl text-gold tabular-nums md:text-4xl">
              {displayAverage.toLocaleString("fa-IR", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
            </p>
            <p className="mt-1 text-xs text-dim">میانگین از ۵</p>
          </div>
          <div>
            <p className="text-2xl font-medium text-primary tabular-nums md:text-3xl">
              {displayReviews.length.toLocaleString("fa-IR")}
            </p>
            <p className="mt-1 text-xs text-dim">
              {usingSamples ? "نمونه نظرات" : "نظر تأییدشده"}
            </p>
          </div>
          <div>
            <p className="text-2xl font-medium text-primary tabular-nums md:text-3xl">
              {Math.round(displayFiveStarShare).toLocaleString("fa-IR")}٪
            </p>
            <p className="mt-1 text-xs text-dim">رضایت ۵ ستاره</p>
          </div>
        </div>
      </Reveal>

      <Reveal delay={0.12}>
        <div
          className="mt-8 flex flex-wrap items-center gap-5 md:mt-10"
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
                className={`border-b pb-0.5 text-xs transition-colors duration-300 md:text-[13px] ${
                  active
                    ? "border-gold text-gold"
                    : "border-transparent text-dim hover:text-secondary"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </Reveal>

      {filtered.length === 0 ? (
        <Reveal delay={0.1}>
          <div className="mt-16 text-center md:mt-20">
            <p className="text-sm text-secondary md:text-base">
              با این فیلتر نظری پیدا نشد.
            </p>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className="mt-4 text-sm text-gold hover:text-gold-bright"
            >
              نمایش همه نظرات
            </button>
          </div>
        </Reveal>
      ) : (
        <ul className="mt-8 grid gap-0 md:mt-10 md:grid-cols-2 md:gap-x-10">
          {filtered.map((review, i) => (
            <Reveal key={review.id} delay={Math.min(i * 0.04, 0.24)}>
              <li className="border-b border-border py-8 last:border-0 md:py-9">
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

                <blockquote className="text-[0.95rem] leading-[1.9] text-secondary text-pretty md:text-base md:leading-[2]">
                  {review.comment}
                </blockquote>

                <footer className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
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
                      className="text-[11px] text-gold/80 transition-colors hover:text-gold"
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
        <div className="mt-16 rounded-3xl border border-border bg-surface/40 px-5 py-10 md:mt-20 md:px-10 md:py-12">
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
