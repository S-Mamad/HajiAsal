"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { ProductImage } from "@/components/ui/ProductImage";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { hajiasalPath } from "@/lib/paths";

const AUTH_HERO_IMAGE = "/images/hajiasal/hero-studio.webp";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  /** Use "start" for long multi-step forms so mobile can scroll from the top. */
  contentAlign?: "center" | "start";
}

export function AuthLayout({
  children,
  title = "ورود یا ثبت‌نام",
  subtitle = "با شماره موبایل، سریع و امن",
  contentAlign = "center",
}: AuthLayoutProps) {
  const siteData = useSiteSettings();
  const reduced = useReducedMotion();

  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-void lg:flex-row">
      <div className="absolute end-3 top-3 z-20 sm:end-5 sm:top-5">
        <ThemeToggle />
      </div>

      <div className="relative hidden min-h-[100dvh] flex-[1.15] overflow-hidden lg:block">
        <ProductImage
          src={AUTH_HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="55vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/50 to-void/10" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(209,160,86,0.22),transparent_55%)]" />
        <div className="relative z-10 flex h-full min-h-[100dvh] flex-col justify-between p-12 xl:p-16">
          <Link
            href={hajiasalPath()}
            className="inline-flex"
            aria-label={siteData.brand.name}
          >
            <BrandLogo name={siteData.brand.name} size="lg" priority />
          </Link>
          <div className="max-w-lg pb-4">
            <p className="font-display text-4xl font-bold leading-[1.15] tracking-tight text-primary xl:text-5xl">
              {siteData.brand.name}
            </p>
            <p className="mt-4 text-lg font-medium leading-snug text-gold">
              {siteData.brand.tagline}
            </p>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-secondary">
              {siteData.brand.description}
            </p>
          </div>
        </div>
      </div>

      <div
        className={
          contentAlign === "start"
            ? "relative flex min-h-[100dvh] flex-1 flex-col justify-start px-5 py-10 pb-[max(2.5rem,env(safe-area-inset-bottom))] md:px-10 md:py-14"
            : "relative flex min-h-[100dvh] flex-1 flex-col justify-center px-5 py-14 md:px-10"
        }
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_0%,rgba(209,160,86,0.08),transparent_45%)] lg:hidden"
        />
        <div className="relative mx-auto w-full max-w-[26rem]">
          <Link
            href={hajiasalPath()}
            className="mb-10 inline-flex lg:hidden"
            aria-label={siteData.brand.name}
          >
            <BrandLogo name={siteData.brand.name} size="lg" />
          </Link>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          >
            <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-primary md:text-[2.15rem]">
              {title}
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{subtitle}</p>
          </motion.div>

          <motion.div
            initial={reduced ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: reduced ? 0 : 0.08,
              ease: [0.32, 0.72, 0, 1],
            }}
            className="mt-9"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
