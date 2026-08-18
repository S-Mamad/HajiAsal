"use client";

import type { ComponentType, ReactNode } from "react";
import Link from "next/link";
import {
  ArrowCounterClockwise,
  CaretLeft,
  ClipboardText,
  Clock,
  Drop,
  Flask,
  IdentificationCard,
  LockKey,
  MagnifyingGlass,
  MapPin,
  Package,
  ShareNetwork,
  ShieldCheck,
  Tag,
  Truck,
  User,
  type IconProps as PhosphorIconProps,
} from "@phosphor-icons/react";
import { Reveal } from "@/components/ui/Reveal";
import { hajiasalPath } from "@/lib/paths";
import type { TrustPageContent } from "@/types";

type TrustKind = "authenticity" | "shipping" | "privacy" | "terms";
type Glyph = ComponentType<PhosphorIconProps>;

interface TrustPageLayoutProps {
  content: TrustPageContent;
  kind: TrustKind;
  children?: ReactNode;
}

const PAGE: Record<
  TrustKind,
  {
    icon: Glyph;
    eyebrow: string;
    sectionIcons: Glyph[];
    related: { href: string; label: string; hint: string }[];
  }
> = {
  authenticity: {
    icon: ShieldCheck,
    eyebrow: "اصالت کالا",
    sectionIcons: [MapPin, Drop, Flask, ArrowCounterClockwise],
    related: [
      {
        href: hajiasalPath("/shipping"),
        label: "ارسال و تحویل",
        hint: "زمان‌بندی و هزینه ارسال",
      },
      {
        href: hajiasalPath("/contact"),
        label: "تماس با ما",
        hint: "سوال درباره کیفیت یا مغایرت",
      },
    ],
  },
  shipping: {
    icon: Truck,
    eyebrow: "تحویل سفارش",
    sectionIcons: [Clock, Package, MagnifyingGlass],
    related: [
      {
        href: hajiasalPath("/authenticity"),
        label: "ضمانت اصالت",
        hint: "ردیابی و تضمین کیفیت",
      },
      {
        href: hajiasalPath("/track-order"),
        label: "پیگیری سفارش",
        hint: "با کد پیگیری، بدون ورود",
      },
    ],
  },
  privacy: {
    icon: LockKey,
    eyebrow: "حفاظت از داده",
    sectionIcons: [IdentificationCard, ShareNetwork, LockKey],
    related: [
      {
        href: hajiasalPath("/terms"),
        label: "قوانین و شرایط",
        hint: "شرایط ثبت سفارش و خرید",
      },
      {
        href: hajiasalPath("/account"),
        label: "حساب کاربری",
        hint: "مدیریت اطلاعات شخصی",
      },
    ],
  },
  terms: {
    icon: ClipboardText,
    eyebrow: "شرایط خرید",
    sectionIcons: [ClipboardText, Tag, User],
    related: [
      {
        href: hajiasalPath("/shipping"),
        label: "ارسال و تحویل",
        hint: "زمان و هزینه ارسال",
      },
      {
        href: hajiasalPath("/privacy"),
        label: "حریم خصوصی",
        hint: "نحوه نگهداری اطلاعات شما",
      },
    ],
  },
};

export function TrustPageLayout({
  content,
  kind,
  children,
}: TrustPageLayoutProps) {
  const meta = PAGE[kind];
  const PageIcon = meta.icon;

  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_70%_80%_at_50%_-20%,var(--gold-dim),transparent_70%)]"
      />
      <div className="relative mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-16">
        <Reveal>
          <header className="mb-8 md:mb-10">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gold-dim text-gold">
              <PageIcon size={28} weight="duotone" />
            </span>
            <p className="mt-5 text-[11px] font-medium tracking-[0.16em] text-gold">
              {meta.eyebrow}
            </p>
            <h1 className="mt-2 font-display text-balance text-3xl font-bold leading-tight tracking-tight text-primary sm:text-4xl">
              {content.title}
            </h1>
            <p className="mt-3 max-w-xl text-pretty text-sm leading-relaxed text-secondary md:text-base">
              {content.intro}
            </p>
          </header>
        </Reveal>

        <ol className="flex flex-col gap-3">
          {content.sections.map((section, i) => {
            const Icon = meta.sectionIcons[i] ?? meta.icon;
            return (
              <Reveal key={section.heading} delay={i * 0.05}>
                <li>
                  <article className="account-surface flex gap-4 rounded-2xl border border-border bg-surface p-4 sm:p-5">
                    <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-dim text-gold">
                      <Icon size={22} weight="duotone" />
                    </span>
                    <div className="min-w-0">
                      <h2 className="text-base font-semibold text-primary">
                        {section.heading}
                      </h2>
                      <p className="mt-1.5 text-sm leading-relaxed text-secondary">
                        {section.body}
                      </p>
                    </div>
                  </article>
                </li>
              </Reveal>
            );
          })}
        </ol>

        {children ? <div className="mt-4">{children}</div> : null}

        <Reveal delay={0.16}>
          <nav aria-label="صفحات مرتبط" className="mt-10">
            <p className="mb-3 px-1 text-[11px] font-medium tracking-[0.14em] text-gold">
              ادامه مطالعه
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              {meta.related.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="account-surface group flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-surface p-4 transition-[border-color,background-color] duration-200 hover:border-gold/30 hover:bg-gold/[0.03] active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/45"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-primary">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-secondary">
                      {item.hint}
                    </span>
                  </span>
                  <CaretLeft
                    size={16}
                    className="shrink-0 text-dim transition-transform group-hover:-translate-x-0.5"
                    aria-hidden
                  />
                </Link>
              ))}
            </div>
          </nav>
        </Reveal>
      </div>
    </div>
  );
}
