import type { Product, SiteConfig } from "@/types";
import { hajiasalAbsoluteUrl } from "@/lib/paths";

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
