import type { Metadata } from "next";
import { Lalezar, Vazirmatn } from "next/font/google";
import { serializeJsonLd } from "@/lib/json-ld";
import { StoreChrome } from "@/components/layout/StoreChrome";
import {
  buildOrganizationJsonLd,
  buildWebSiteJsonLd,
} from "@/lib/seo";
import { getSiteSettings } from "@/lib/server/site-settings";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { hajiasalAbsoluteUrl } from "@/lib/paths";
import "@/styles/globals.css";

const vazirmatn = Vazirmatn({
  variable: "--font-vazirmatn",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const lalezar = Lalezar({
  variable: "--font-lalezar",
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
});

const siteData = site as SiteConfig;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const ogImage = `${siteUrl}/images/hajiasal/og/og.webp`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: `${siteData.brand.name} | عسل طبیعی و اصل`,
    template: `%s | ${siteData.brand.name}`,
  },
  description: siteData.brand.description,
  keywords: [
    "عسل طبیعی",
    "عسل اصل",
    "حاجی عسل",
    "خرید عسل",
    "عسل کوهستان",
    "ژل رویال",
  ],
  alternates: {
    canonical: hajiasalAbsoluteUrl(),
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    url: hajiasalAbsoluteUrl(),
    siteName: siteData.brand.name,
    title: `${siteData.brand.name} | عسل طبیعی و اصل`,
    description: siteData.brand.tagline,
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: siteData.brand.name,
      },
    ],
  },
  icons: {
    icon: [
      { url: "/images/hajiasal/brand/mark.svg", type: "image/svg+xml" },
    ],
    apple: [{ url: "/images/hajiasal/brand/mark.svg" }],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteData.brand.name} | عسل طبیعی و اصل`,
    description: siteData.brand.tagline,
    images: [ogImage],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const siteData = await getSiteSettings();
  const orgJsonLd = buildOrganizationJsonLd(siteData);
  const webSiteJsonLd = buildWebSiteJsonLd(siteData);

  return (
    <html lang="fa" dir="rtl" className={`${vazirmatn.variable} ${lalezar.variable} hajiasal-root h-full antialiased`} data-theme="light">
      <body className="flex min-h-full flex-col overflow-x-hidden bg-void text-primary">
      <script
        dangerouslySetInnerHTML={{
          __html: `(function(){try{var k='hajiasal-theme';var t=localStorage.getItem(k);if(t!=='light'&&t!=='dark')t='light';var r=document.currentScript&&document.currentScript.parentElement;if(r)r.setAttribute('data-theme',t);document.documentElement.setAttribute('data-hajiasal-theme',t);}catch(e){}})();`,
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(orgJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(webSiteJsonLd) }}
      />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[200] focus:start-4 focus:top-4 focus:rounded-lg focus:bg-gold focus:px-4 focus:py-2 focus:text-ink-on-gold"
      >
        پرش به محتوای اصلی
      </a>
      <StoreChrome siteSettings={siteData}>{children}</StoreChrome>
    </body>
    </html>
  );
}
