"use client";

import Image from "next/image";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { hajiasalPath } from "@/lib/paths";
import { ArrowLeft, Sparkle } from "@phosphor-icons/react";

const siteData = site as SiteConfig;

const STATS = [
  { value: "۳۰+", label: "محصول متنوع" },
  { value: "۴.۹", label: "رضایت مشتری" },
  { value: "۶", label: "سال تجربه" },
] as const;

export function Hero() {
  return (
    <section className="relative -mt-14 flex min-h-[100dvh] flex-col overflow-hidden bg-void sm:-mt-16">
      <div className="relative h-[42dvh] min-h-[220px] w-full shrink-0 md:absolute md:inset-0 md:h-auto md:min-h-0">
        <Image
          src={siteData.hero.image}
          alt="شیشه عسل طبیعی حاجی عسل با نور استودیویی"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[center_42%] opacity-90 md:object-center md:opacity-50"
        />
        <div className="hero-wash-mobile absolute inset-0 md:hidden" />
        <div className="hero-wash-desktop absolute inset-0 hidden md:block" />
        <div className="mesh-warm absolute inset-0 hidden md:block" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-10 pt-6 sm:px-6 md:absolute md:inset-0 md:justify-end md:px-8 md:pb-28 md:pt-24">
        <Reveal className="max-w-xl">
          <span className="mb-3 inline-flex items-center gap-2 text-[11px] font-medium tracking-[0.18em] text-gold sm:mb-5">
            <Sparkle size={14} weight="fill" />
            عسل اصل ایرانی
          </span>
          <h1 className="mb-3 font-display text-[1.85rem] leading-[1.2] tracking-tight text-primary text-balance sm:mb-4 sm:text-5xl md:mb-5 md:text-6xl">
            {siteData.brand.name}
          </h1>
          <p className="mb-6 max-w-md text-sm leading-relaxed text-secondary sm:mb-7 sm:text-base md:mb-8 md:text-lg">
            {siteData.hero.subtitle}
          </p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
            <Button
              href={hajiasalPath(siteData.hero.ctaHref)}
              size="lg"
              className="w-full sm:w-auto"
            >
              {siteData.hero.cta}
              <ArrowLeft size={18} weight="bold" />
            </Button>
            <Button
              href={hajiasalPath("/reviews")}
              variant="outline"
              size="lg"
              className="w-full border-border-bright text-primary hover:border-gold/50 sm:w-auto"
            >
              نظرات مشتریان
            </Button>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-10 flex flex-wrap gap-x-5 gap-y-4 sm:mt-14 sm:gap-8 md:mt-16">
          {STATS.map((stat) => (
            <div
              key={stat.label}
              className="min-w-[4.5rem] border-s border-border-bright ps-4 first:border-0 first:ps-0 sm:min-w-0 sm:ps-8"
            >
              <p className="text-xl font-bold tabular-nums text-gold sm:text-2xl">
                {stat.value}
              </p>
              <p className="mt-0.5 text-[11px] text-dim sm:text-sm">{stat.label}</p>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
