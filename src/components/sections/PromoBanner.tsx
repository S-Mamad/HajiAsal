"use client";

import { Tag } from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

export function PromoBanner() {
  return (
    <section className="py-8 md:py-16">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-surface px-4 py-7 sm:px-8 md:p-12">
            <div
              className="absolute inset-0 bg-cover bg-center opacity-20 md:opacity-25"
              style={{
                backgroundImage: "url(/images/hajiasal/hero-studio.png)",
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-surface/80 via-surface/90 to-surface md:bg-gradient-to-l md:from-surface md:via-surface/90 md:to-surface/70" />
            <div className="relative flex flex-col items-stretch gap-5 text-center sm:items-start sm:text-start md:flex-row md:items-center md:justify-between">
              <div>
                <span className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium tracking-wide text-gold">
                  <Tag size={14} weight="fill" />
                  کد تخفیف: HAJI10
                </span>
                <h2 className="font-display text-xl text-primary sm:text-2xl md:text-3xl">
                  ۱۰٪ تخفیف اولین خرید
                </h2>
                <p className="mt-2 text-sm text-secondary md:text-base">
                  برای سفارش‌های بالای ۳۰۰ هزار تومان
                </p>
              </div>
              <Button href={hajiasalPath("/shop")} size="lg" className="w-full sm:w-auto">
                خرید کنید
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
