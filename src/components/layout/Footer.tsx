"use client";

import Link from "next/link";
import { Phone, Envelope, InstagramLogo } from "@phosphor-icons/react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { BrandLogo } from "@/components/ui/BrandLogo";
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
];

const ENAMAD_HREF =
  "https://trustseal.enamad.ir/?id=759178&Code=3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";
const ENAMAD_SRC =
  "https://trustseal.enamad.ir/logo.aspx?id=759178&Code=3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";
const ENAMAD_CODE = "3HO7QSKRb8oSthAlzX6BLgc7k9e03wDp";

function EnamadSeal({ className }: { className?: string }) {
  // Keep official Enamad markup (including non-standard `code`) for seal verification.
  return (
    <span
      className={className}
      aria-label="نماد اعتماد الکترونیکی"
      dangerouslySetInnerHTML={{
        __html: `<a referrerpolicy="origin" target="_blank" rel="noopener noreferrer" href="${ENAMAD_HREF}"><img referrerpolicy="origin" src="${ENAMAD_SRC}" alt="نماد اعتماد الکترونیکی" style="cursor:pointer;width:5rem;height:auto" code="${ENAMAD_CODE}"></a>`,
      }}
    />
  );
}

export function Footer() {
  const siteData = useSiteSettings();

  return (
    <footer className="border-t border-border bg-void">
      {/* Mobile */}
      <div className="mx-auto max-w-7xl px-5 py-12 md:hidden">
        <div className="text-center">
          <div className="flex justify-center">
            <BrandLogo name={siteData.brand.name} />
          </div>
          <p className="mx-auto mt-3 max-w-sm text-[13px] leading-relaxed text-secondary">
            {siteData.brand.description}
          </p>
        </div>

        <nav
          aria-label="لینک‌های فوتر"
          className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
        >
          {mobileQuickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-[13px] text-secondary transition-colors active:text-gold"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mx-auto mt-8 flex max-w-xs flex-col items-center gap-2.5 text-[13px] text-dim">
          <a
            href={`tel:${siteData.footer.phone.replace(/\s/g, "")}`}
            className="inline-flex items-center gap-2 transition-colors active:text-gold"
            dir="ltr"
          >
            <Phone size={14} weight="light" className="text-gold/80" />
            {siteData.footer.phone}
          </a>
          <a
            href={`mailto:${siteData.footer.email}`}
            className="inline-flex max-w-full items-center gap-2 truncate transition-colors active:text-gold"
          >
            <Envelope size={14} weight="light" className="shrink-0 text-gold/80" />
            <span className="truncate">{siteData.footer.email}</span>
          </a>
          <p className="text-center text-[12px] leading-relaxed text-dim">
            {siteData.footer.address}
          </p>
          {siteData.social?.instagram ? (
            <a
              href={siteData.social.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 transition-colors active:text-gold"
            >
              <InstagramLogo size={14} weight="light" className="text-gold/80" />
              اینستاگرام
            </a>
          ) : null}
        </div>

        <div className="mt-8 flex justify-center">
          <EnamadSeal />
        </div>

        <div className="mt-10 border-t border-border pt-5 text-center">
          <p className="text-[11px] text-dim">
            © {new Date().getFullYear()} {siteData.brand.name}
          </p>
        </div>
      </div>

      {/* Desktop */}
      <div className="mx-auto hidden max-w-7xl px-8 py-20 md:block">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-1">
            <BrandLogo name={siteData.brand.name} className="mb-3" />
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
            <div className="mt-6">
              <EnamadSeal />
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
