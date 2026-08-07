"use client";

import { getImageProps } from "next/image";
import { motion, useReducedMotion } from "motion/react";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
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
  width: 2400,
  height: 1350,
  quality: 90,
});

const {
  props: { srcSet: mobileSrcSet, ...mobileImg },
} = getImageProps({
  ...common,
  src: HERO_MOBILE,
  width: 1200,
  height: 1600,
  quality: 90,
  priority: true,
});

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative -mt-16 flex h-[100dvh] max-h-[100dvh] flex-col overflow-hidden bg-void sm:-mt-[4.75rem] md:h-auto md:min-h-[100dvh] md:max-h-none">
      <div className="absolute inset-0">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          {/* eslint-disable-next-line @next/next/no-img-element -- art-directed picture via getImageProps */}
          <img
            {...mobileImg}
            srcSet={mobileSrcSet}
            alt={common.alt}
            className="hero-ken absolute inset-0 h-full w-full object-cover object-[center_32%] md:object-[32%_42%]"
          />
        </picture>
        <div className="hero-wash absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-void/55 via-void/10 to-transparent max-md:hidden" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void from-[28%] via-void/70 via-[52%] to-transparent to-[78%] md:hidden" />
        <div className="mesh-warm pointer-events-none absolute inset-0 opacity-30 md:opacity-40" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-[calc(var(--mobile-dock-clearance)+1.5rem)] pt-20 sm:px-6 sm:pb-[calc(var(--mobile-dock-clearance)+2rem)] sm:pt-24 md:px-8 lg:pb-28 lg:pt-24">
        <motion.div
          className="max-w-xl"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="mb-3 sm:mb-5 md:mb-7">
            <BrandLogo
              name={siteData.brand.name}
              size="xl"
              priority
              markClassName="!h-[4.25rem] w-auto drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)] sm:!h-[4.75rem] md:!h-40 lg:!h-44"
            />
          </div>
          <h1 className="mb-2 font-display text-[1.35rem] leading-[1.2] tracking-tight text-primary text-balance sm:mb-3 sm:text-3xl md:mb-5 md:text-4xl lg:text-[2.75rem]">
            {siteData.hero.title}
          </h1>
          <p className="mb-4 max-w-md text-[0.875rem] leading-relaxed text-secondary sm:mb-6 sm:text-base md:mb-8 md:text-lg">
            {siteData.hero.subtitle}
          </p>
          <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3">
            <Button
              href={hajiasalPath(siteData.hero.ctaHref)}
              size="lg"
              className="w-full whitespace-nowrap px-5 sm:w-auto sm:px-8"
            >
              {siteData.hero.cta}
              <ArrowLeft size={18} weight="bold" className="shrink-0" />
            </Button>
            <Button
              href={hajiasalPath("/reviews")}
              variant="outline"
              size="lg"
              className="w-full whitespace-nowrap border-border-bright bg-surface px-5 text-primary hover:border-gold/50 sm:w-auto sm:px-8"
            >
              نظرات مشتریان
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
