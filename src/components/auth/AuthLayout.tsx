"use client";

import Link from "next/link";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { ProductImage } from "@/components/ui/ProductImage";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { hajiasalPath } from "@/lib/paths";

const AUTH_HERO_IMAGE = "/images/about/brand-story-honey.webp";

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
}

export function AuthLayout({
  children,
  title = "به حاجی عسل خوش آمدید",
  subtitle = "ورود سریع با موبایل برای خرید امن",
}: AuthLayoutProps) {
  const siteData = useSiteSettings();
  return (
    <div className="relative flex min-h-[100dvh] flex-col bg-void lg:flex-row">
      <div className="absolute end-3 top-3 z-20 sm:end-5 sm:top-5">
        <ThemeToggle />
      </div>

      <div className="relative hidden min-h-[100dvh] flex-1 overflow-hidden bg-surface-elevated lg:flex">
        <ProductImage
          src={AUTH_HERO_IMAGE}
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-void via-void/55 to-transparent" />
        <div className="relative z-10 flex flex-col justify-end p-12">
          <Link href={hajiasalPath()} className="mb-8 inline-flex" aria-label={siteData.brand.name}>
            <BrandLogo name={siteData.brand.name} />
          </Link>
          <p className="max-w-md text-2xl font-bold leading-tight text-primary">
            {siteData.brand.tagline}
          </p>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-secondary">
            {siteData.brand.description}
          </p>
        </div>
      </div>

      <div className="flex min-h-[100dvh] flex-1 flex-col justify-center px-4 py-12 md:px-8">
        <div className="mx-auto w-full max-w-md">
          <Link
            href={hajiasalPath()}
            className="mb-8 inline-flex lg:hidden"
            aria-label={siteData.brand.name}
          >
            <BrandLogo name={siteData.brand.name} />
          </Link>
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-primary md:text-3xl">{title}</h1>
            <p className="mt-2 text-sm text-muted">{subtitle}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-md md:p-8">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
