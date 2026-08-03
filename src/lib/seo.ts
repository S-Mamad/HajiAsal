import type { Metadata } from "next";
import type { Product, SiteConfig } from "@/types";
import { hajiasalAbsoluteUrl, hajiasalCanonical } from "@/lib/paths";

/** Parse admin SEO robots string like "index,follow" / "noindex,nofollow". */
export function parseSeoRobots(
  value?: string,
): NonNullable<Metadata["robots"]> | undefined {
  if (!value?.trim()) return undefined;
  const tokens = value
    .toLowerCase()
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  if (tokens.length === 0) return undefined;
  return {
    index: !tokens.includes("noindex"),
    follow: !tokens.includes("nofollow"),
  };
}

export function buildProductMetadata(product: Product): Metadata {
  const seo = product.seo;
  const title = seo?.title || product.title;
  const description = seo?.description || product.shortDescription;
  const ogTitle = seo?.ogTitle || title;
  const ogDescription = seo?.ogDescription || description;
  const ogImage = seo?.ogImage || product.images[0];
  const twTitle = seo?.twitterTitle || ogTitle;
  const twDescription = seo?.twitterDescription || ogDescription;
  const twImage = seo?.twitterImage || ogImage;
  const canonical =
    seo?.canonical?.trim() ||
    hajiasalCanonical(`/product/${product.slug}`);
  const robots = parseSeoRobots(seo?.robots);

  return {
    title,
    description,
    ...(robots ? { robots } : {}),
    alternates: { canonical },
    openGraph: {
      type: "website",
      title: ogTitle,
      description: ogDescription,
      url: canonical.startsWith("http")
        ? canonical
        : hajiasalAbsoluteUrl(`/product/${product.slug}`),
      ...(ogImage
        ? { images: [{ url: ogImage, alt: product.title }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: twTitle,
      description: twDescription,
      ...(twImage ? { images: [twImage] } : {}),
    },
  };
}

export function buildOrganizationJsonLd(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: site.brand.name,
    description: site.brand.description,
    url: hajiasalAbsoluteUrl(),
    contactPoint: {
      "@type": "ContactPoint",
      telephone: site.footer.phone,
      email: site.footer.email,
      contactType: "customer service",
      availableLanguage: "Persian",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: site.footer.address,
      addressCountry: "IR",
    },
  };
}

export function buildProductJsonLd(product: Product) {
  const prices = product.weightOptions.map((w) => w.price);
  const minPrice = Math.min(...(prices.length ? prices : [0]));
  const lowPrice =
    product.discountPrice && product.discountPrice < minPrice
      ? product.discountPrice
      : minPrice;
  const seo = product.seo;
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seo?.title || product.title,
    description: seo?.description || product.shortDescription,
    image: seo?.ogImage ? [seo.ogImage, ...product.images] : product.images,
    sku: product.sku || product.id,
    brand: {
      "@type": "Brand",
      name: "حاجی عسل",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "IRR",
      lowPrice,
      highPrice: Math.max(...(prices.length ? prices : [0])),
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      url: seo?.canonical || hajiasalAbsoluteUrl(`/product/${product.slug}`),
    },
  };

  if (product.reviewCount > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount,
    };
  }

  return jsonLd;
}

export function buildProductSeoBundle(product: Product) {
  const faq = product.seo?.faq?.length
    ? buildFaqJsonLd(product.seo.faq)
    : null;
  return {
    product: buildProductJsonLd(product),
    breadcrumb: buildBreadcrumbJsonLd([
      { name: "خانه", href: "/" },
      { name: "فروشگاه", href: "/shop" },
      {
        name: product.categoryLabel,
        href: `/shop?category=${product.category}`,
      },
      { name: product.title, href: `/product/${product.slug}` },
    ]),
    faq,
  };
}

export function buildBreadcrumbJsonLd(
  items: Array<{ name: string; href: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => {
      const href = item.href.startsWith("http")
        ? item.href
        : hajiasalAbsoluteUrl(item.href === "/" ? "" : item.href);
      return {
        "@type": "ListItem",
        position: index + 1,
        name: item.name,
        item: href,
      };
    }),
  };
}

export function buildWebSiteJsonLd(site: SiteConfig) {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.brand.name,
    url: hajiasalAbsoluteUrl(),
    description: site.brand.description,
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${hajiasalAbsoluteUrl("/shop")}?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function buildFaqJsonLd(
  items: Array<{ question: string; answer: string }>,
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
