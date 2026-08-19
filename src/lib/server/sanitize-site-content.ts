import type {
  NavItem,
  SiteConfig,
  SocialLinks,
  TrustPageContent,
} from "@/types";
import {
  sanitizeCtaHref,
  sanitizeEmail,
  sanitizeHttpUrl,
  sanitizeMultiline,
  sanitizePhone,
  sanitizePlainText,
  sanitizeSitePath,
} from "./safe-copy";

export class CopySanitizeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CopySanitizeError";
  }
}

const SOCIAL_KEYS: Array<keyof SocialLinks> = [
  "instagram",
  "eitaa",
  "telegram",
  "rubika",
  "bale",
  "soroush",
  "supportEitaa",
  "supportTelegram",
];

function requireHttpUrl(raw: string, label: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const url = sanitizeHttpUrl(trimmed);
  if (!url) {
    throw new CopySanitizeError(
      `${label}: فقط لینک http یا https پذیرفته می‌شود.`,
    );
  }
  return url;
}

function trustPage(raw: unknown): TrustPageContent {
  const page = (raw ?? {}) as Partial<TrustPageContent>;
  const sections = Array.isArray(page.sections)
    ? page.sections.slice(0, 12).map((section) => ({
        heading: sanitizePlainText(section?.heading, 120),
        body: sanitizeMultiline(section?.body, 4000),
      }))
    : [];
  return {
    title: sanitizePlainText(page.title, 120),
    intro: sanitizeMultiline(page.intro, 800),
    sections,
  };
}

export function sanitizeSiteContentPatch(
  input: Record<string, unknown>,
): Partial<SiteConfig> {
  const out: Record<string, unknown> = {};

  if (input.hero && typeof input.hero === "object") {
    const hero = input.hero as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (hero.title !== undefined) next.title = sanitizePlainText(hero.title, 80);
    if (hero.subtitle !== undefined) {
      next.subtitle = sanitizeMultiline(hero.subtitle, 400);
    }
    if (hero.cta !== undefined) next.cta = sanitizePlainText(hero.cta, 40);
    if (hero.ctaHref !== undefined) {
      next.ctaHref = sanitizeCtaHref(hero.ctaHref) || "/shop";
    }
    if (hero.image !== undefined) {
      next.image = sanitizeSitePath(hero.image);
    }
    if (hero.imageMobile !== undefined) {
      next.imageMobile = sanitizeSitePath(hero.imageMobile);
    }
    out.hero = next;
  }

  if (input.brand && typeof input.brand === "object") {
    const brand = input.brand as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (brand.name !== undefined) next.name = sanitizePlainText(brand.name, 40);
    if (brand.tagline !== undefined) {
      next.tagline = sanitizePlainText(brand.tagline, 160);
    }
    if (brand.description !== undefined) {
      next.description = sanitizeMultiline(brand.description, 800);
    }
    out.brand = next;
  }

  if (input.brandStory && typeof input.brandStory === "object") {
    const story = input.brandStory as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (story.title !== undefined) {
      next.title = sanitizePlainText(story.title, 80);
    }
    if (story.image !== undefined) {
      next.image = sanitizeSitePath(story.image);
    }
    if (Array.isArray(story.paragraphs)) {
      next.paragraphs = story.paragraphs
        .map((p) => sanitizeMultiline(p, 1200))
        .filter(Boolean)
        .slice(0, 8);
    }
    out.brandStory = next;
  }

  if (input.aboutPage && typeof input.aboutPage === "object") {
    const about = input.aboutPage as Record<string, unknown>;
    out.aboutPage = {
      paragraphs: Array.isArray(about.paragraphs)
        ? about.paragraphs
            .map((p) => sanitizeMultiline(p, 1200))
            .filter(Boolean)
            .slice(0, 12)
        : [],
    };
  }

  if (input.footer && typeof input.footer === "object") {
    const footer = input.footer as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (footer.phone !== undefined) {
      next.phone = sanitizePhone(footer.phone);
    }
    if (footer.email !== undefined) {
      const emailRaw = String(footer.email).trim();
      const email = emailRaw ? sanitizeEmail(emailRaw) : "";
      if (emailRaw && !email) {
        throw new CopySanitizeError("ایمیل فوتر نامعتبر است.");
      }
      next.email = email;
    }
    if (footer.address !== undefined) {
      next.address = sanitizePlainText(footer.address, 200);
    }
    out.footer = next;
  }

  if (input.social && typeof input.social === "object") {
    const social = input.social as Record<string, unknown>;
    const next: SocialLinks = {};
    for (const key of SOCIAL_KEYS) {
      if (social[key] === undefined) continue;
      const raw = typeof social[key] === "string" ? social[key] : "";
      next[key] = requireHttpUrl(raw, key);
    }
    out.social = next;
  }

  if (Array.isArray(input.nav)) {
    out.nav = input.nav.slice(0, 12).map((item): NavItem => {
      const row = (item ?? {}) as Record<string, unknown>;
      const href = sanitizeCtaHref(row.href);
      if (!href) {
        throw new CopySanitizeError(
          "آدرس منو باید مسیر داخلی سایت یا لینک https باشد.",
        );
      }
      return {
        id: sanitizePlainText(row.id, 40).replace(/[^a-z0-9-]/gi, "") || "item",
        label: sanitizePlainText(row.label, 40),
        href,
      };
    });
  }

  if (Array.isArray(input.faq)) {
    out.faq = input.faq.slice(0, 24).map((item, index) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id:
          sanitizePlainText(row.id, 40).replace(/[^a-z0-9-]/gi, "") ||
          `faq-${index + 1}`,
        question: sanitizePlainText(row.question, 160),
        answer: sanitizeMultiline(row.answer, 2000),
      };
    });
  }

  if (Array.isArray(input.trustItems)) {
    out.trustItems = input.trustItems.slice(0, 6).map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: sanitizePlainText(row.id, 40).replace(/[^a-z0-9-]/gi, "") || "item",
        title: sanitizePlainText(row.title, 60),
        description: sanitizePlainText(row.description, 160),
      };
    });
  }

  if (Array.isArray(input.milestones)) {
    out.milestones = input.milestones.slice(0, 12).map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        year: sanitizePlainText(row.year, 12),
        title: sanitizePlainText(row.title, 80),
        description: sanitizePlainText(row.description, 240),
      };
    });
  }

  if (input.trustPages && typeof input.trustPages === "object") {
    const pages = input.trustPages as Record<string, unknown>;
    const next: Record<string, TrustPageContent> = {};
    for (const key of ["authenticity", "privacy", "terms", "shipping"] as const) {
      if (pages[key] !== undefined) next[key] = trustPage(pages[key]);
    }
    out.trustPages = next;
  }

  if (input.pageCopy && typeof input.pageCopy === "object") {
    out.pageCopy = sanitizePageCopyPatch(input.pageCopy as Record<string, unknown>);
  }

  return out as Partial<SiteConfig>;
}

function sanitizePageCopyLink(raw: unknown) {
  const row = (raw ?? {}) as Record<string, unknown>;
  const label = sanitizePlainText(row.label, 40);
  const href = sanitizeCtaHref(row.href);
  if (!label || !href) return null;
  return { label, href };
}

function sanitizePageCopyPatch(input: Record<string, unknown>) {
  const out: Record<string, unknown> = {};

  const textFields = (
    source: Record<string, unknown> | undefined,
    specs: Array<[string, number]>,
  ) => {
    if (!source) return undefined;
    const next: Record<string, unknown> = {};
    for (const [key, max] of specs) {
      if (source[key] === undefined) continue;
      next[key] = sanitizePlainText(source[key], max);
    }
    return Object.keys(next).length ? next : undefined;
  };

  const home = textFields(input.home as Record<string, unknown>, [
    ["heroImageAlt", 120],
    ["heroSecondaryCtaLabel", 40],
    ["heroSecondaryCtaHref", 120],
    ["promoBadge", 60],
    ["promoTitle", 80],
    ["promoSubtitle", 120],
    ["promoCta", 40],
    ["promoCtaHref", 120],
    ["bestsellersTitle", 60],
    ["bestsellersSubtitle", 120],
    ["categoriesTitle", 60],
    ["categoriesSubtitle", 120],
    ["testimonialsEyebrow", 40],
    ["testimonialsTitle", 60],
    ["brandStoryCta", 24],
    ["brandStoryImageAlt", 120],
  ]);
  if (home) out.home = home;

  const faq = textFields(input.faq as Record<string, unknown>, [
    ["title", 60],
    ["subtitle", 160],
  ]);
  if (faq) out.faq = faq;

  const contact = textFields(input.contact as Record<string, unknown>, [
    ["title", 60],
    ["subtitle", 160],
    ["phoneLabel", 24],
    ["emailLabel", 24],
    ["addressLabel", 24],
  ]);
  if (contact) out.contact = contact;

  const footerRaw = input.footer as Record<string, unknown> | undefined;
  if (footerRaw) {
    const footer = textFields(footerRaw, [
      ["quickLinksTitle", 40],
      ["legalLinksTitle", 40],
      ["contactTitle", 40],
      ["bottomTagline", 120],
      ["copyrightSuffix", 80],
    ]) ?? {};
    for (const key of ["quickLinks", "legalLinks", "mobileQuickLinks"] as const) {
      if (!Array.isArray(footerRaw[key])) continue;
      footer[key] = footerRaw[key]
        .map((item) => sanitizePageCopyLink(item))
        .filter(Boolean)
        .slice(0, key === "quickLinks" ? 16 : key === "legalLinks" ? 8 : 12);
    }
    if (Object.keys(footer).length) out.footer = footer;
  }

  const cart = textFields(input.cart as Record<string, unknown>, [
    ["title", 40],
    ["emptyTitle", 60],
    ["emptyDescription", 200],
    ["emptyCtaPopular", 40],
    ["emptyCtaHome", 40],
    ["summaryTitle", 40],
    ["removeUnavailable", 40],
    ["checkoutCta", 40],
    ["selectAvailable", 40],
    ["continueShopping", 40],
    ["readyToPay", 32],
    ["stickyPayableLabel", 40],
    ["stickyCheckout", 32],
    ["stickyRemoveUnavailable", 32],
    ["stickySelectAvailable", 32],
    ["breakdownSheetTitle", 40],
    ["subtotalLabel", 24],
    ["shippingLabel", 24],
    ["freeShippingLabel", 24],
    ["shippingLaterHint", 120],
    ["discountLabel", 24],
    ["totalLabel", 40],
  ]);
  if (cart) out.cart = cart;

  const auth = textFields(input.auth as Record<string, unknown>, [
    ["title", 60],
    ["subtitle", 120],
  ]);
  if (auth) out.auth = auth;

  const social = textFields(input.social as Record<string, unknown>, [
    ["heading", 120],
    ["handle", 40],
  ]);
  if (social) out.social = social;

  const supportRaw = input.support as Record<string, unknown> | undefined;
  if (supportRaw) {
    const support = textFields(supportRaw, [
      ["panelTitle", 60],
      ["composerPlaceholder", 80],
      ["quickPromptsSection", 40],
    ]) ?? {};
    if (Array.isArray(supportRaw.quickPrompts)) {
      support.quickPrompts = supportRaw.quickPrompts
        .slice(0, 8)
        .map((item) => {
          const row = (item ?? {}) as Record<string, unknown>;
          const id = sanitizePlainText(row.id, 32).replace(/[^a-z0-9-_]/gi, "");
          const label = sanitizePlainText(row.label, 40);
          const body =
            typeof row.body === "string" ? sanitizeMultiline(row.body, 400) : "";
          if (!id || !label) return null;
          return { id, label, body };
        })
        .filter(Boolean);
    }
    if (Object.keys(support).length) out.support = support;
  }

  const ticketsRaw = input.tickets as Record<string, unknown> | undefined;
  if (ticketsRaw?.statusHints && typeof ticketsRaw.statusHints === "object") {
    const hints = textFields(ticketsRaw.statusHints as Record<string, unknown>, [
      ["open", 80],
      ["waiting", 80],
      ["pending", 80],
      ["answered", 80],
      ["resolved", 80],
      ["closed", 80],
    ]);
    if (hints) out.tickets = { statusHints: hints };
  }

  if (input.homeSlider && typeof input.homeSlider === "object") {
    const slider = input.homeSlider as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    if (slider.autoplay !== undefined) next.autoplay = Boolean(slider.autoplay);
    if (slider.intervalMs !== undefined) {
      const ms = Number(slider.intervalMs);
      if (Number.isFinite(ms)) {
        next.intervalMs = Math.min(30000, Math.max(2000, ms));
      }
    }
    if (Object.keys(next).length) out.homeSlider = next;
  }

  if (input.homeSections && typeof input.homeSections === "object") {
    const sections = input.homeSections as Record<string, unknown>;
    const next: Record<string, unknown> = {};

    if (sections.amazingDeals && typeof sections.amazingDeals === "object") {
      const deals = sections.amazingDeals as Record<string, unknown>;
      const dealsNext: Record<string, unknown> = {};
      if (deals.enabled !== undefined) dealsNext.enabled = Boolean(deals.enabled);
      if (deals.title !== undefined) {
        dealsNext.title = sanitizePlainText(deals.title, 80);
      }
      if (deals.subtitle !== undefined) {
        dealsNext.subtitle = sanitizePlainText(deals.subtitle, 160);
      }
      if (deals.limit !== undefined) {
        const limit = Number(deals.limit);
        if (Number.isFinite(limit)) {
          dealsNext.limit = Math.min(24, Math.max(1, limit));
        }
      }
      if (deals.sort === "popular" || deals.sort === "newest" || deals.sort === "discount-desc") {
        dealsNext.sort = deals.sort;
      }
      if (Object.keys(dealsNext).length) next.amazingDeals = dealsNext;
    }

    if (sections.sellerBanner && typeof sections.sellerBanner === "object") {
      const seller = sections.sellerBanner as Record<string, unknown>;
      const sellerNext: Record<string, unknown> = {};
      if (seller.enabled !== undefined) sellerNext.enabled = Boolean(seller.enabled);
      if (seller.title !== undefined) {
        sellerNext.title = sanitizePlainText(seller.title, 80);
      }
      if (seller.description !== undefined) {
        sellerNext.description = sanitizeMultiline(seller.description, 400);
      }
      if (seller.image !== undefined) {
        sellerNext.image = sanitizeSitePath(seller.image);
      }
      if (seller.ctaText !== undefined) {
        sellerNext.ctaText = sanitizePlainText(seller.ctaText, 40);
      }
      if (seller.ctaHref !== undefined) {
        sellerNext.ctaHref = sanitizeCtaHref(seller.ctaHref) || "/seller/apply";
      }
      if (Object.keys(sellerNext).length) next.sellerBanner = sellerNext;
    }

    if (Object.keys(next).length) out.homeSections = next;
  }

  return out;
}
