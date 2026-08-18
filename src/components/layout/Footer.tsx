"use client";

import Link from "next/link";
import { Phone, Envelope } from "@phosphor-icons/react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
import { SocialFollowSection } from "@/components/social/SocialFollowSection";
import { hajiasalPath } from "@/lib/paths";

const footerLinks = [
  { label: "فروشگاه", href: hajiasalPath("/shop") },
  { label: "درباره ما", href: hajiasalPath("/about") },
  { label: "حساب کاربری", href: hajiasalPath("/account") },
  { label: "نظرات مشتریان", href: hajiasalPath("/reviews") },
  { label: "تماس", href: hajiasalPath("/contact") },
  { label: "سوالات", href: hajiasalPath("/faq") },
  { label: "پیگیری سفارش", href: hajiasalPath("/track-order") },
  { label: "علاقه‌مندی‌ها", href: hajiasalPath("/wishlist") },
  { label: "فروشنده شوید", href: hajiasalPath("/seller/apply") },
];

const legalLinks = [
  { label: "ضمانت اصالت", href: hajiasalPath("/authenticity") },
  { label: "ارسال و تحویل", href: hajiasalPath("/shipping") },
  { label: "قوانین", href: hajiasalPath("/terms") },
  { label: "حریم خصوصی", href: hajiasalPath("/privacy") },
];

const mobileQuickLinks = [
  { label: "فروشگاه", href: hajiasalPath("/shop") },
  { label: "پیگیری", href: hajiasalPath("/track-order") },
  { label: "تماس", href: hajiasalPath("/contact") },
  { label: "اصالت", href: hajiasalPath("/authenticity") },
  { label: "ارسال", href: hajiasalPath("/shipping") },
  { label: "سوالات", href: hajiasalPath("/faq") },
  { label: "فروشنده شوید", href: hajiasalPath("/seller/apply") },
];

const ENAMAD_HREF =
  "https://trustseal.enamad.ir/?id=759178&Code=3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";
const ENAMAD_SRC =
  "https://trustseal.enamad.ir/logo.aspx?id=759178&Code=3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";
const ENAMAD_CODE = "3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";

function EnamadSeal({
  className,
  width = "4rem",
}: {
  className?: string;
  width?: string;
}) {
  // Keep official Enamad markup (including non-standard `code`) for seal verification.
  return (
    <span
      className={className}
      aria-label="نماد اعتماد الکترونیکی"
      dangerouslySetInnerHTML={{
        __html: `<a referrerpolicy="origin" target="_blank" rel="noopener noreferrer" href="${ENAMAD_HREF}"><img referrerpolicy="origin" src="${ENAMAD_SRC}" alt="نماد اعتماد الکترونیکی" style="cursor:pointer;width:${width};height:auto" code="${ENAMAD_CODE}"></a>`,
      }}
    />
  );
}

export function Footer() {
  const siteData = useSiteSettings();

  return (
    <footer
      data-site-footer
      className="relative z-[1] shrink-0 border-t border-border bg-void"
    >
      {/* Mobile — compact so short pages (cart, wishlist) are not footer-dominated */}
      <div className="mx-auto max-w-7xl px-4 py-7 md:hidden">
        <div className="flex flex-col items-center gap-2 text-center">
          <BrandLogo name={siteData.brand.name} size="md" />
          <p className="line-clamp-2 max-w-xs text-[12px] leading-snug text-secondary">
            {siteData.brand.tagline}
          </p>
        </div>

        <nav
          aria-label="لینک‌های فوتر"
          className="mt-5 flex flex-wrap items-center justify-center gap-x-3.5 gap-y-2"
        >
          {mobileQuickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[12px] text-secondary transition-colors active:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-[12px] text-dim">
          <a
            href={`tel:${siteData.footer.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-1.5 transition-colors active:text-gold"
            dir="ltr"
          >
            <Phone size={13} weight="light" className="text-gold/80" />
            {siteData.footer.phone}
          </a>
          <a
            href={`mailto:${siteData.footer.email}`}
            className="inline-flex max-w-[14rem] items-center gap-1.5 truncate transition-colors active:text-gold"
          >
            <Envelope size={13} weight="light" className="shrink-0 text-gold/80" />
            <span className="truncate">{siteData.footer.email}</span>
          </a>
        </div>

        <SocialFollowSection
          social={siteData.social}
          compact
          className="mx-auto mt-5 max-w-sm"
        />

        <div className="mt-5 flex flex-col items-center gap-3 border-t border-border pt-5">
          <EnamadSeal />
          <p className="text-center text-[11px] leading-relaxed text-dim">
            © {new Date().getFullYear()} {siteData.brand.name}
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-7xl px-8 py-14 md:block lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.9fr)_minmax(0,0.9fr)_minmax(0,1.3fr)]">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo name={siteData.brand.name} size="lg" className="mb-4" />
            <p className="max-w-md text-sm leading-relaxed text-secondary">
              {siteData.brand.description}
            </p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">
              دسترسی سریع
            </h4>
            <ul className="flex flex-col gap-2.5">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">
              اعتماد و قوانین
            </h4>
            <ul className="flex flex-col gap-2.5">
              {legalLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-secondary transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold text-primary">تماس با ما</h4>
            <ul className="flex flex-col gap-3 text-sm text-secondary">
              <li className="flex items-center gap-2">
                <Phone size={16} weight="light" className="shrink-0 text-gold" />
                <a
                  href={`tel:${siteData.footer.phone.replace(/\s/g, "")}`}
                  className="transition-colors hover:text-gold"
                  dir="ltr"
                >
                  {siteData.footer.phone}
                </a>
              </li>
              <li className="flex min-w-0 items-center gap-2">
                <Envelope size={16} weight="light" className="shrink-0 text-gold" />
                <span className="truncate">{siteData.footer.email}</span>
              </li>
              <li className="text-sm leading-relaxed text-dim">
                {siteData.footer.address}
              </li>
            </ul>
            <SocialFollowSection
              social={siteData.social}
              compact
              className="mt-6 max-w-full"
            />
            <div className="mt-6">
              <EnamadSeal width="5rem" />
            </div>
          </div>
        </div>

        <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6 text-xs text-dim">
          <p>
            © {new Date().getFullYear()} {siteData.brand.name}. تمامی حقوق محفوظ
            است.
          </p>
          <p>ارسال سراسری · ضمانت اصالت · پشتیبانی خرید</p>
        </div>
      </div>
    </footer>
  );
}
