"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SealCheck } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import type { Review } from "@/lib/server/reviews";

interface TestimonialsProps {
  reviews: Review[];
}

export function Testimonials({ reviews }: TestimonialsProps) {
  const [active, setActive] = useState(0);
  const list = reviews.length > 0 ? reviews : [];
  const review = list[active] ?? list[0];
  const touchX = useRef<number | null>(null);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (list.length === 0) return;
      setActive((i) => (i + dir + list.length) % list.length);
    },
    [list.length],
  );

  useEffect(() => {
    if (list.length < 2) return;
    const id = window.setInterval(() => go(1), 8000);
    return () => window.clearInterval(id);
  }, [go, list.length]);

  useEffect(() => {
    if (active >= list.length) setActive(0);
  }, [active, list.length]);

  if (!review) return null;

  return (
    <section className="py-12 md:py-28">
      <div className="mx-auto max-w-2xl px-5 md:px-8">
        <Reveal className="mb-8 text-center md:mb-14">
          <p className="mb-2 text-[10px] font-medium tracking-[0.22em] text-gold md:mb-3 md:text-[11px]">
            صدای مشتریان
          </p>
          <h2 className="font-display text-[1.35rem] tracking-tight text-primary md:text-3xl">
            نظر خریداران
          </h2>
        </Reveal>

        <Reveal>
          <div
            className="relative text-center"
            onTouchStart={(e) => {
              touchX.current = e.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchX.current == null) return;
              const end = e.changedTouches[0]?.clientX ?? touchX.current;
              const delta = end - touchX.current;
              touchX.current = null;
              if (Math.abs(delta) < 40) return;
              // RTL: swipe right (positive) → previous, left → next
              go(delta > 0 ? -1 : 1);
            }}
          >
            <AnimatePresence mode="wait">
              <motion.blockquote
                key={review.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="flex flex-col items-center px-1"
              >
                <p className="max-w-md text-[0.95rem] leading-[1.85] text-secondary text-pretty md:max-w-xl md:text-lg md:leading-[2]">
                  <span className="me-1 text-gold/40" aria-hidden>
                    «
                  </span>
                  {review.comment}
                  <span className="ms-1 text-gold/40" aria-hidden>
                    »
                  </span>
                </p>
                <footer className="mt-6 flex flex-col items-center gap-1 md:mt-10 md:gap-1.5">
                  <cite className="not-italic text-[13px] font-medium text-primary md:text-sm">
                    {review.author}
                  </cite>
                  {review.verified ? (
                    <span className="inline-flex items-center gap-1 text-[10px] text-dim md:text-[11px]">
                      <SealCheck
                        size={11}
                        weight="fill"
                        className="text-gold/60"
                      />
                      تأییدشده
                    </span>
                  ) : null}
                </footer>
              </motion.blockquote>
            </AnimatePresence>
          </div>

          {list.length > 1 ? (
            <div className="mt-7 flex items-center justify-center gap-1.5 md:mt-12 md:gap-2">
              {list.map((item, i) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActive(i)}
                  className={`h-1 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                    i === active
                      ? "w-5 bg-gold md:w-6"
                      : "w-1 bg-surface-muted hover:bg-surface-muted"
                  }`}
                  aria-label={`نظر ${i + 1}`}
                  aria-current={i === active}
                />
              ))}
            </div>
          ) : null}
        </Reveal>
      </div>
    </section>
  );
}
