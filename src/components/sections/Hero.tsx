"use client";

import { getImageProps } from "next/image";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { hajiasalPath } from "@/lib/paths";
import { ArrowLeft } from "@phosphor-icons/react";

const siteData = site as SiteConfig;

const HERO_DESKTOP =
  siteData.hero.image || "/images/hajiasal/hero-studio.webp";
const HERO_MOBILE =
  siteData.hero.imageMobile || "/images/hajiasal/hero-mobile.webp";

const common = {
  alt: "شیشه عسل طلایی حاجی عسل با شهد روان و موم طبیعی",
  sizes: "100vw",
} as const;

const {
  props: { srcSet: desktopSrcSet },
} = getImageProps({
  ...common,
  src: HERO_DESKTOP,
  width: 1920,
  height: 1080,
  quality: 82,
});

const {
  props: { srcSet: mobileSrcSet, ...mobileImg },
} = getImageProps({
  ...common,
  src: HERO_MOBILE,
  width: 1080,
  height: 1440,
  quality: 82,
  priority: true,
});

export function Hero() {
  return (
    <section className="relative -mt-14 flex min-h-[100dvh] flex-col overflow-hidden bg-void sm:-mt-16">
      <div className="absolute inset-0">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          {/* eslint-disable-next-line @next/next/no-img-element -- art-directed picture via getImageProps */}
          <img
            {...mobileImg}
            srcSet={mobileSrcSet}
            alt={common.alt}
            className="absolute inset-0 h-full w-full object-cover object-[center_22%] md:object-[68%_40%]"
          />
        </picture>
        <div className="hero-wash absolute inset-0" />
        <div className="mesh-warm pointer-events-none absolute inset-0 opacity-40 md:opacity-55" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-11 pt-28 sm:px-6 sm:pb-14 md:px-8 md:pb-28 md:pt-24">
        <Reveal className="max-w-xl">
          <p className="mb-2 text-[11px] font-medium tracking-[0.2em] text-gold sm:mb-3 sm:text-xs">
            عسل اصل ایرانی
          </p>
          <h1 className="mb-3 font-display text-[2.15rem] leading-[1.15] tracking-tight text-primary text-balance sm:mb-4 sm:text-5xl md:mb-5 md:text-6xl lg:text-7xl">
            {siteData.brand.name}
          </h1>
          <p className="mb-7 max-w-md text-[0.95rem] leading-relaxed text-secondary sm:mb-8 sm:text-base md:text-lg">
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
              className="w-full border-border-bright bg-void/40 text-primary backdrop-blur-sm hover:border-gold/50 sm:w-auto"
            >
              نظرات مشتریان
            </Button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
