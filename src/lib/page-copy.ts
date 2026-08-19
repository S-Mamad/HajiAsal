import type { SiteConfig } from "@/types";

export type PageCopyLink = {
  label: string;
  href: string;
};

export type PageCopyQuickPrompt = {
  id: string;
  label: string;
  body: string;
};

export type PageCopySettings = {
  home: {
    heroImageAlt: string;
    heroSecondaryCtaLabel: string;
    heroSecondaryCtaHref: string;
    promoBadge: string;
    promoTitle: string;
    promoSubtitle: string;
    promoCta: string;
    promoCtaHref: string;
    bestsellersTitle: string;
    bestsellersSubtitle: string;
    categoriesTitle: string;
    categoriesSubtitle: string;
    testimonialsEyebrow: string;
    testimonialsTitle: string;
    brandStoryCta: string;
    brandStoryImageAlt: string;
  };
  faq: {
    title: string;
    subtitle: string;
  };
  contact: {
    title: string;
    subtitle: string;
    phoneLabel: string;
    emailLabel: string;
    addressLabel: string;
  };
  footer: {
    quickLinksTitle: string;
    legalLinksTitle: string;
    contactTitle: string;
    bottomTagline: string;
    copyrightSuffix: string;
    quickLinks: PageCopyLink[];
    legalLinks: PageCopyLink[];
    mobileQuickLinks: PageCopyLink[];
  };
  cart: {
    title: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyCtaPopular: string;
    emptyCtaHome: string;
    summaryTitle: string;
    removeUnavailable: string;
    checkoutCta: string;
    selectAvailable: string;
    continueShopping: string;
    readyToPay: string;
    stickyPayableLabel: string;
    stickyCheckout: string;
    stickyRemoveUnavailable: string;
    stickySelectAvailable: string;
    breakdownSheetTitle: string;
    subtotalLabel: string;
    shippingLabel: string;
    freeShippingLabel: string;
    shippingLaterHint: string;
    discountLabel: string;
    totalLabel: string;
  };
  auth: {
    title: string;
    subtitle: string;
  };
  social: {
    heading: string;
    handle: string;
  };
  support: {
    panelTitle: string;
    composerPlaceholder: string;
    quickPromptsSection: string;
    quickPrompts: PageCopyQuickPrompt[];
  };
  tickets: {
    statusHints: {
      open: string;
      waiting: string;
      pending: string;
      answered: string;
      resolved: string;
      closed: string;
    };
  };
};

export const DEFAULT_PAGE_COPY: PageCopySettings = {
  home: {
    heroImageAlt: "شیشه عسل طلایی حاجی عسل با شهد روان و موم طبیعی",
    heroSecondaryCtaLabel: "نظرات مشتریان",
    heroSecondaryCtaHref: "/reviews",
    promoBadge: "کد تخفیف: HAJI10",
    promoTitle: "۱۰٪ تخفیف اولین خرید",
    promoSubtitle: "برای سفارش‌های بالای ۳۰۰ هزار تومان",
    promoCta: "خرید کنید",
    promoCtaHref: "/shop",
    bestsellersTitle: "پرفروش‌ترین‌ها",
    bestsellersSubtitle: "محبوب‌ترین عسل‌های حاجی عسل",
    categoriesTitle: "دسته‌بندی محصولات",
    categoriesSubtitle: "عسل مورد علاقه خود را انتخاب کنید",
    testimonialsEyebrow: "صدای مشتریان",
    testimonialsTitle: "نظر خریداران",
    brandStoryCta: "بیشتر",
    brandStoryImageAlt: "عسل طبیعی حاجی عسل",
  },
  faq: {
    title: "سوالات متداول",
    subtitle: "پاسخ پرسش‌های رایج درباره خرید، ارسال و نگهداری عسل",
  },
  contact: {
    title: "تماس با ما",
    subtitle: "سؤال، پیشنهاد یا درخواست مشاوره. پاسخگوی شما هستیم",
    phoneLabel: "موبایل",
    emailLabel: "ایمیل",
    addressLabel: "آدرس",
  },
  footer: {
    quickLinksTitle: "دسترسی سریع",
    legalLinksTitle: "اعتماد و قوانین",
    contactTitle: "تماس با ما",
    bottomTagline: "ارسال سراسری · ضمانت اصالت · پشتیبانی خرید",
    copyrightSuffix: "تمامی حقوق محفوظ است.",
    quickLinks: [
      { label: "فروشگاه", href: "/shop" },
      { label: "درباره ما", href: "/about" },
      { label: "حساب کاربری", href: "/account" },
      { label: "نظرات مشتریان", href: "/reviews" },
      { label: "تماس", href: "/contact" },
      { label: "سوالات", href: "/faq" },
      { label: "پیگیری سفارش", href: "/track-order" },
      { label: "علاقه‌مندی‌ها", href: "/wishlist" },
      { label: "فروشنده شوید", href: "/seller/apply" },
    ],
    legalLinks: [
      { label: "ضمانت اصالت", href: "/authenticity" },
      { label: "ارسال و تحویل", href: "/shipping" },
      { label: "قوانین", href: "/terms" },
      { label: "حریم خصوصی", href: "/privacy" },
    ],
    mobileQuickLinks: [
      { label: "فروشگاه", href: "/shop" },
      { label: "پیگیری", href: "/track-order" },
      { label: "تماس", href: "/contact" },
      { label: "اصالت", href: "/authenticity" },
      { label: "ارسال", href: "/shipping" },
      { label: "سوالات", href: "/faq" },
      { label: "فروشنده شوید", href: "/seller/apply" },
    ],
  },
  cart: {
    title: "سبد خرید",
    emptyTitle: "سبد خرید خالی است",
    emptyDescription:
      "هنوز چیزی انتخاب نکرده‌اید. از پرفروش‌ترین‌ها شروع کنید یا به فروشگاه برگردید.",
    emptyCtaPopular: "مشاهده پرفروش‌ترین‌ها",
    emptyCtaHome: "بازگشت به صفحه اصلی",
    summaryTitle: "خلاصه سفارش",
    removeUnavailable: "حذف کالاهای ناموجود",
    checkoutCta: "ادامه فرآیند خرید",
    selectAvailable: "انتخاب کالای موجود",
    continueShopping: "ادامه خرید",
    readyToPay: "آماده پرداخت",
    stickyPayableLabel: "مبلغ قابل پرداخت",
    stickyCheckout: "ادامه خرید",
    stickyRemoveUnavailable: "حذف ناموجودها",
    stickySelectAvailable: "کالای موجود",
    breakdownSheetTitle: "جزئیات مبلغ",
    subtotalLabel: "جمع جزء",
    shippingLabel: "هزینه ارسال",
    freeShippingLabel: "بدون هزینه",
    shippingLaterHint: "هزینه ارسال بعد از ادامه خرید محاسبه می‌شود.",
    discountLabel: "تخفیف",
    totalLabel: "مبلغ قابل پرداخت",
  },
  auth: {
    title: "ورود یا ثبت‌نام",
    subtitle: "با شماره موبایل، سریع و امن",
  },
  social: {
    heading: "ما را در شبکه‌های اجتماعی دنبال کنید",
    handle: "@hajiasal_ir",
  },
  support: {
    panelTitle: "پشتیبانی حاجی‌عسل",
    composerPlaceholder: "پیام خود را بنویسید…",
    quickPromptsSection: "موضوع پرتکرار",
    quickPrompts: [
      {
        id: "order",
        label: "پیگیری سفارش",
        body: "سلام، می‌خواهم وضعیت سفارشم را پیگیری کنم.",
      },
      {
        id: "pay",
        label: "مشکل پرداخت",
        body: "سلام، در پرداخت سفارش به مشکل خوردم.",
      },
      {
        id: "stock",
        label: "موجودی محصول",
        body: "سلام، می‌خواستم از موجودی این محصول مطلع شوم.",
      },
      { id: "other", label: "سوال دیگر", body: "" },
    ],
  },
  tickets: {
    statusHints: {
      open: "پیام‌تان را می‌خوانیم",
      waiting: "پاسخ همین‌جا می‌آید",
      pending: "پشتیبان پاسخ داده؛ منتظر شماست",
      answered: "پشتیبان پاسخ داده",
      resolved: "مشکل حل شده",
      closed: "این گفتگو بسته است",
    },
  },
};

function asText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

function asLinks(
  value: unknown,
  fallback: PageCopyLink[],
  maxItems: number,
): PageCopyLink[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const out: PageCopyLink[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const label = asText((raw as PageCopyLink).label, "", 40);
    const href = asText((raw as PageCopyLink).href, "", 120);
    if (!label || !href) continue;
    out.push({ label, href });
    if (out.length >= maxItems) break;
  }
  return out.length > 0 ? out : fallback.map((item) => ({ ...item }));
}

function asQuickPrompts(
  value: unknown,
  fallback: PageCopyQuickPrompt[],
): PageCopyQuickPrompt[] {
  if (!Array.isArray(value)) return fallback.map((item) => ({ ...item }));
  const out: PageCopyQuickPrompt[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== "object") continue;
    const id = asText((raw as PageCopyQuickPrompt).id, "", 32);
    const label = asText((raw as PageCopyQuickPrompt).label, "", 40);
    const body =
      typeof (raw as PageCopyQuickPrompt).body === "string"
        ? (raw as PageCopyQuickPrompt).body.slice(0, 400)
        : "";
    if (!id || !label) continue;
    out.push({ id, label, body });
    if (out.length >= 8) break;
  }
  return out.length > 0 ? out : fallback.map((item) => ({ ...item }));
}

export function resolvePageCopy(
  settings: Partial<SiteConfig> | null | undefined,
): PageCopySettings {
  const raw = settings?.pageCopy;
  const home = raw?.home;
  const faq = raw?.faq;
  const contact = raw?.contact;
  const footer = raw?.footer;
  const cart = raw?.cart;
  const auth = raw?.auth;
  const social = raw?.social;
  const support = raw?.support;
  const tickets = raw?.tickets;
  const hints = tickets?.statusHints;

  return {
    home: {
      heroImageAlt: asText(
        home?.heroImageAlt,
        DEFAULT_PAGE_COPY.home.heroImageAlt,
        120,
      ),
      heroSecondaryCtaLabel: asText(
        home?.heroSecondaryCtaLabel,
        DEFAULT_PAGE_COPY.home.heroSecondaryCtaLabel,
        40,
      ),
      heroSecondaryCtaHref: asText(
        home?.heroSecondaryCtaHref,
        DEFAULT_PAGE_COPY.home.heroSecondaryCtaHref,
        120,
      ),
      promoBadge: asText(
        home?.promoBadge,
        DEFAULT_PAGE_COPY.home.promoBadge,
        60,
      ),
      promoTitle: asText(
        home?.promoTitle,
        DEFAULT_PAGE_COPY.home.promoTitle,
        80,
      ),
      promoSubtitle: asText(
        home?.promoSubtitle,
        DEFAULT_PAGE_COPY.home.promoSubtitle,
        120,
      ),
      promoCta: asText(home?.promoCta, DEFAULT_PAGE_COPY.home.promoCta, 40),
      promoCtaHref: asText(
        home?.promoCtaHref,
        DEFAULT_PAGE_COPY.home.promoCtaHref,
        120,
      ),
      bestsellersTitle: asText(
        home?.bestsellersTitle,
        DEFAULT_PAGE_COPY.home.bestsellersTitle,
        60,
      ),
      bestsellersSubtitle: asText(
        home?.bestsellersSubtitle,
        DEFAULT_PAGE_COPY.home.bestsellersSubtitle,
        120,
      ),
      categoriesTitle: asText(
        home?.categoriesTitle,
        DEFAULT_PAGE_COPY.home.categoriesTitle,
        60,
      ),
      categoriesSubtitle: asText(
        home?.categoriesSubtitle,
        DEFAULT_PAGE_COPY.home.categoriesSubtitle,
        120,
      ),
      testimonialsEyebrow: asText(
        home?.testimonialsEyebrow,
        DEFAULT_PAGE_COPY.home.testimonialsEyebrow,
        40,
      ),
      testimonialsTitle: asText(
        home?.testimonialsTitle,
        DEFAULT_PAGE_COPY.home.testimonialsTitle,
        60,
      ),
      brandStoryCta: asText(
        home?.brandStoryCta,
        DEFAULT_PAGE_COPY.home.brandStoryCta,
        24,
      ),
      brandStoryImageAlt: asText(
        home?.brandStoryImageAlt,
        DEFAULT_PAGE_COPY.home.brandStoryImageAlt,
        120,
      ),
    },
    faq: {
      title: asText(faq?.title, DEFAULT_PAGE_COPY.faq.title, 60),
      subtitle: asText(faq?.subtitle, DEFAULT_PAGE_COPY.faq.subtitle, 160),
    },
    contact: {
      title: asText(contact?.title, DEFAULT_PAGE_COPY.contact.title, 60),
      subtitle: asText(
        contact?.subtitle,
        DEFAULT_PAGE_COPY.contact.subtitle,
        160,
      ),
      phoneLabel: asText(
        contact?.phoneLabel,
        DEFAULT_PAGE_COPY.contact.phoneLabel,
        24,
      ),
      emailLabel: asText(
        contact?.emailLabel,
        DEFAULT_PAGE_COPY.contact.emailLabel,
        24,
      ),
      addressLabel: asText(
        contact?.addressLabel,
        DEFAULT_PAGE_COPY.contact.addressLabel,
        24,
      ),
    },
    footer: {
      quickLinksTitle: asText(
        footer?.quickLinksTitle,
        DEFAULT_PAGE_COPY.footer.quickLinksTitle,
        40,
      ),
      legalLinksTitle: asText(
        footer?.legalLinksTitle,
        DEFAULT_PAGE_COPY.footer.legalLinksTitle,
        40,
      ),
      contactTitle: asText(
        footer?.contactTitle,
        DEFAULT_PAGE_COPY.footer.contactTitle,
        40,
      ),
      bottomTagline: asText(
        footer?.bottomTagline,
        DEFAULT_PAGE_COPY.footer.bottomTagline,
        120,
      ),
      copyrightSuffix: asText(
        footer?.copyrightSuffix,
        DEFAULT_PAGE_COPY.footer.copyrightSuffix,
        80,
      ),
      quickLinks: asLinks(
        footer?.quickLinks,
        DEFAULT_PAGE_COPY.footer.quickLinks,
        16,
      ),
      legalLinks: asLinks(
        footer?.legalLinks,
        DEFAULT_PAGE_COPY.footer.legalLinks,
        8,
      ),
      mobileQuickLinks: asLinks(
        footer?.mobileQuickLinks,
        DEFAULT_PAGE_COPY.footer.mobileQuickLinks,
        12,
      ),
    },
    cart: {
      title: asText(cart?.title, DEFAULT_PAGE_COPY.cart.title, 40),
      emptyTitle: asText(
        cart?.emptyTitle,
        DEFAULT_PAGE_COPY.cart.emptyTitle,
        60,
      ),
      emptyDescription: asText(
        cart?.emptyDescription,
        DEFAULT_PAGE_COPY.cart.emptyDescription,
        200,
      ),
      emptyCtaPopular: asText(
        cart?.emptyCtaPopular,
        DEFAULT_PAGE_COPY.cart.emptyCtaPopular,
        40,
      ),
      emptyCtaHome: asText(
        cart?.emptyCtaHome,
        DEFAULT_PAGE_COPY.cart.emptyCtaHome,
        40,
      ),
      summaryTitle: asText(
        cart?.summaryTitle,
        DEFAULT_PAGE_COPY.cart.summaryTitle,
        40,
      ),
      removeUnavailable: asText(
        cart?.removeUnavailable,
        DEFAULT_PAGE_COPY.cart.removeUnavailable,
        40,
      ),
      checkoutCta: asText(
        cart?.checkoutCta,
        DEFAULT_PAGE_COPY.cart.checkoutCta,
        40,
      ),
      selectAvailable: asText(
        cart?.selectAvailable,
        DEFAULT_PAGE_COPY.cart.selectAvailable,
        40,
      ),
      continueShopping: asText(
        cart?.continueShopping,
        DEFAULT_PAGE_COPY.cart.continueShopping,
        40,
      ),
      readyToPay: asText(
        cart?.readyToPay,
        DEFAULT_PAGE_COPY.cart.readyToPay,
        32,
      ),
      stickyPayableLabel: asText(
        cart?.stickyPayableLabel,
        DEFAULT_PAGE_COPY.cart.stickyPayableLabel,
        40,
      ),
      stickyCheckout: asText(
        cart?.stickyCheckout,
        DEFAULT_PAGE_COPY.cart.stickyCheckout,
        32,
      ),
      stickyRemoveUnavailable: asText(
        cart?.stickyRemoveUnavailable,
        DEFAULT_PAGE_COPY.cart.stickyRemoveUnavailable,
        32,
      ),
      stickySelectAvailable: asText(
        cart?.stickySelectAvailable,
        DEFAULT_PAGE_COPY.cart.stickySelectAvailable,
        32,
      ),
      breakdownSheetTitle: asText(
        cart?.breakdownSheetTitle,
        DEFAULT_PAGE_COPY.cart.breakdownSheetTitle,
        40,
      ),
      subtotalLabel: asText(
        cart?.subtotalLabel,
        DEFAULT_PAGE_COPY.cart.subtotalLabel,
        24,
      ),
      shippingLabel: asText(
        cart?.shippingLabel,
        DEFAULT_PAGE_COPY.cart.shippingLabel,
        24,
      ),
      freeShippingLabel: asText(
        cart?.freeShippingLabel,
        DEFAULT_PAGE_COPY.cart.freeShippingLabel,
        24,
      ),
      shippingLaterHint: asText(
        cart?.shippingLaterHint,
        DEFAULT_PAGE_COPY.cart.shippingLaterHint,
        120,
      ),
      discountLabel: asText(
        cart?.discountLabel,
        DEFAULT_PAGE_COPY.cart.discountLabel,
        24,
      ),
      totalLabel: asText(
        cart?.totalLabel,
        DEFAULT_PAGE_COPY.cart.totalLabel,
        40,
      ),
    },
    auth: {
      title: asText(auth?.title, DEFAULT_PAGE_COPY.auth.title, 60),
      subtitle: asText(auth?.subtitle, DEFAULT_PAGE_COPY.auth.subtitle, 120),
    },
    social: {
      heading: asText(
        social?.heading,
        DEFAULT_PAGE_COPY.social.heading,
        120,
      ),
      handle: asText(social?.handle, DEFAULT_PAGE_COPY.social.handle, 40),
    },
    support: {
      panelTitle: asText(
        support?.panelTitle,
        DEFAULT_PAGE_COPY.support.panelTitle,
        60,
      ),
      composerPlaceholder: asText(
        support?.composerPlaceholder,
        DEFAULT_PAGE_COPY.support.composerPlaceholder,
        80,
      ),
      quickPromptsSection: asText(
        support?.quickPromptsSection,
        DEFAULT_PAGE_COPY.support.quickPromptsSection,
        40,
      ),
      quickPrompts: asQuickPrompts(
        support?.quickPrompts,
        DEFAULT_PAGE_COPY.support.quickPrompts,
      ),
    },
    tickets: {
      statusHints: {
        open: asText(hints?.open, DEFAULT_PAGE_COPY.tickets.statusHints.open, 80),
        waiting: asText(
          hints?.waiting,
          DEFAULT_PAGE_COPY.tickets.statusHints.waiting,
          80,
        ),
        pending: asText(
          hints?.pending,
          DEFAULT_PAGE_COPY.tickets.statusHints.pending,
          80,
        ),
        answered: asText(
          hints?.answered,
          DEFAULT_PAGE_COPY.tickets.statusHints.answered,
          80,
        ),
        resolved: asText(
          hints?.resolved,
          DEFAULT_PAGE_COPY.tickets.statusHints.resolved,
          80,
        ),
        closed: asText(
          hints?.closed,
          DEFAULT_PAGE_COPY.tickets.statusHints.closed,
          80,
        ),
      },
    },
  };
}

export function resolveTicketStatusHint(
  copy: PageCopySettings,
  status: string,
): string | undefined {
  const key = status as keyof PageCopySettings["tickets"]["statusHints"];
  return copy.tickets.statusHints[key];
}
