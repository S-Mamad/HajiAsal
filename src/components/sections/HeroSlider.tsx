"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getImageProps } from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { CaretLeft, CaretRight } from "@phosphor-icons/react";
import type { ResolvedHomeSliderSettings } from "@/lib/home-sections";
import type { BannerRecord } from "@/lib/server/admin-platform-store";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { usePageCopy } from "@/hooks/usePageCopy";
import { Button } from "@/components/ui/Button";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { hajiasalPath } from "@/lib/paths";
import { ArrowLeft } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type HeroSliderProps = {
  slides: BannerRecord[];
  settings: ResolvedHomeSliderSettings;
};

function SlidePicture({
  slide,
  alt,
  priority,
}: {
  slide: BannerRecord;
  alt: string;
  priority?: boolean;
}) {
  const desktop = slide.imageUrl;
  const mobile = slide.imageMobileUrl || slide.imageUrl;

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    alt,
    sizes: "100vw",
    src: desktop,
    width: 2400,
    height: 1350,
    quality: 82,
  });

  const {
    props: { srcSet: mobileSrcSet, ...mobileImg },
  } = getImageProps({
    alt,
    sizes: "100vw",
    src: mobile,
    width: 1200,
    height: 1600,
    quality: 82,
    priority,
  });

  return (
    <picture>
      <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        {...mobileImg}
        srcSet={mobileSrcSet}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover object-[center_32%] md:object-[32%_42%]"
      />
    </picture>
  );
}

function StaticHeroFallback() {
  const reduced = useReducedMotion();
  const siteData = useSiteSettings();
  const copy = usePageCopy();

  const heroDesktop =
    siteData.hero.image || "/images/hajiasal/hero-studio.webp";
  const heroMobile =
    siteData.hero.imageMobile || "/images/hajiasal/hero-mobile.webp";

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    alt: copy.home.heroImageAlt,
    sizes: "100vw",
    src: heroDesktop,
    width: 2400,
    height: 1350,
    quality: 82,
  });

  const {
    props: { srcSet: mobileSrcSet, ...mobileImg },
  } = getImageProps({
    alt: copy.home.heroImageAlt,
    sizes: "100vw",
    src: heroMobile,
    width: 1200,
    height: 1600,
    quality: 82,
    priority: true,
  });

  return (
    <section className="relative -mt-16 flex h-[100svh] max-h-[100svh] flex-col overflow-hidden bg-void sm:-mt-[4.75rem] md:h-auto md:min-h-[100svh] md:max-h-none">
      <div className="absolute inset-0">
        <picture>
          <source media="(min-width: 768px)" srcSet={desktopSrcSet} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            {...mobileImg}
            srcSet={mobileSrcSet}
            alt={copy.home.heroImageAlt}
            className="absolute inset-0 h-full w-full object-cover object-[center_32%] md:object-[32%_42%]"
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
              href={hajiasalPath(copy.home.heroSecondaryCtaHref)}
              variant="outline"
              size="lg"
              className="w-full whitespace-nowrap border-border-bright bg-surface px-5 text-primary hover:border-gold/50 sm:w-auto sm:px-8"
            >
              {copy.home.heroSecondaryCtaLabel}
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function HeroSlider({ slides, settings }: HeroSliderProps) {
  if (slides.length === 0) {
    return <StaticHeroFallback />;
  }

  if (slides.length === 1) {
    return (
      <SingleSlideHero slide={slides[0]!} showBrandLogo />
    );
  }

  return (
    <MultiSlideHero slides={slides} settings={settings} />
  );
}

function SingleSlideHero({
  slide,
  showBrandLogo,
}: {
  slide: BannerRecord;
  showBrandLogo?: boolean;
}) {
  const siteData = useSiteSettings();
  const copy = usePageCopy();
  const reduced = useReducedMotion();
  const ctaHref = slide.ctaHref || slide.linkUrl || "/shop";
  const ctaText = slide.ctaText || "مشاهده";

  return (
    <section className="relative -mt-16 flex h-[100svh] max-h-[100svh] flex-col overflow-hidden bg-void sm:-mt-[4.75rem] md:h-auto md:min-h-[100svh] md:max-h-none">
      <div className="absolute inset-0">
        <SlidePicture slide={slide} alt={slide.title} priority />
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
          {showBrandLogo ? (
            <div className="mb-3 sm:mb-5 md:mb-7">
              <BrandLogo
                name={siteData.brand.name}
                size="xl"
                priority
                markClassName="!h-[4.25rem] w-auto drop-shadow-[0_8px_28px_rgba(0,0,0,0.45)] sm:!h-[4.75rem] md:!h-40 lg:!h-44"
              />
            </div>
          ) : null}
          <h1 className="mb-2 font-display text-[1.35rem] leading-[1.2] tracking-tight text-primary text-balance sm:mb-3 sm:text-3xl md:mb-5 md:text-4xl lg:text-[2.75rem]">
            {slide.title}
          </h1>
          {slide.subtitle ? (
            <p className="mb-4 max-w-md text-[0.875rem] leading-relaxed text-secondary sm:mb-6 sm:text-base md:mb-8 md:text-lg">
              {slide.subtitle}
            </p>
          ) : null}
          {ctaHref ? (
            <Button
              href={hajiasalPath(ctaHref)}
              size="lg"
              className="w-full whitespace-nowrap px-5 sm:w-auto sm:px-8"
            >
              {ctaText}
              <ArrowLeft size={18} weight="bold" className="shrink-0" />
            </Button>
          ) : null}
        </motion.div>
      </div>
    </section>
  );
}

function MultiSlideHero({
  slides,
  settings,
}: {
  slides: BannerRecord[];
  settings: ResolvedHomeSliderSettings;
}) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback(
    (next: number) => {
      setIndex((next + slides.length) % slides.length);
    },
    [slides.length],
  );

  const goNext = useCallback(() => goTo(index + 1), [goTo, index]);
  const goPrev = useCallback(() => goTo(index - 1), [goTo, index]);

  useEffect(() => {
    if (!settings.autoplay || paused || reduced || slides.length <= 1) return;
    const timer = window.setInterval(goNext, settings.intervalMs);
    return () => window.clearInterval(timer);
  }, [settings.autoplay, settings.intervalMs, paused, reduced, goNext, slides.length]);

  const slide = slides[index]!;

  return (
    <section
      className="relative -mt-16 flex h-[100svh] max-h-[100svh] flex-col overflow-hidden bg-void sm:-mt-[4.75rem] md:h-auto md:min-h-[100svh] md:max-h-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
        setPaused(true);
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        touchStartX.current = null;
        if (start == null) return;
        const end = e.changedTouches[0]?.clientX ?? start;
        const delta = end - start;
        if (Math.abs(delta) > 48) {
          if (delta > 0) goPrev();
          else goNext();
        }
        window.setTimeout(() => setPaused(false), 800);
      }}
      aria-roledescription="carousel"
      aria-label="اسلایدر صفحه اصلی"
    >
      <div className="absolute inset-0">
        {slides.map((s, i) => (
          <div
            key={s.id}
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]",
              i === index ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            aria-hidden={i !== index}
          >
            <SlidePicture slide={s} alt={s.title} priority={i === 0} />
          </div>
        ))}
        <div className="hero-wash absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-l from-void/55 via-void/10 to-transparent max-md:hidden" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-void from-[28%] via-void/70 via-[52%] to-transparent to-[78%] md:hidden" />
        <div className="mesh-warm pointer-events-none absolute inset-0 opacity-30 md:opacity-40" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-end px-4 pb-[calc(var(--mobile-dock-clearance)+1.5rem)] pt-20 sm:px-6 sm:pb-[calc(var(--mobile-dock-clearance)+2rem)] sm:pt-24 md:px-8 lg:pb-28 lg:pt-24">
        <motion.div
          key={slide.id}
          className="max-w-xl"
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        >
          <h1 className="mb-2 font-display text-[1.35rem] leading-[1.2] tracking-tight text-primary text-balance sm:mb-3 sm:text-3xl md:mb-5 md:text-4xl lg:text-[2.75rem]">
            {slide.title}
          </h1>
          {slide.subtitle ? (
            <p className="mb-4 max-w-md text-[0.875rem] leading-relaxed text-secondary sm:mb-6 sm:text-base md:mb-8 md:text-lg">
              {slide.subtitle}
            </p>
          ) : null}
          {(slide.ctaHref || slide.linkUrl) ? (
            <Button
              href={hajiasalPath(slide.ctaHref || slide.linkUrl || "/shop")}
              size="lg"
              className="w-full whitespace-nowrap px-5 sm:w-auto sm:px-8"
            >
              {slide.ctaText || "مشاهده"}
              <ArrowLeft size={18} weight="bold" className="shrink-0" />
            </Button>
          ) : null}
        </motion.div>

        <div className="mt-6 flex items-center justify-between gap-4 md:mt-8">
          <div className="flex items-center gap-2">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setIndex(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-6 bg-gold"
                    : "w-2 bg-primary/30 hover:bg-primary/50",
                )}
                aria-label={`اسلاید ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
              />
            ))}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-bright bg-surface/80 text-secondary backdrop-blur transition-colors hover:border-gold/50 hover:text-gold"
              aria-label="اسلاید قبلی"
            >
              <CaretRight size={18} />
            </button>
            <button
              type="button"
              onClick={goNext}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-border-bright bg-surface/80 text-secondary backdrop-blur transition-colors hover:border-gold/50 hover:text-gold"
              aria-label="اسلاید بعدی"
            >
              <CaretLeft size={18} />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export type { HeroSliderProps };
