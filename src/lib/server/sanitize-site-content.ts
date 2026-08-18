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

  return out as Partial<SiteConfig>;
}
