"use client";

import Link from "next/link";
import {
  ShoppingBag,
  Minus,
  Plus,
  Check,
  Leaf,
  ShieldCheck,
  Medal,
  Truck,
  Shield,
} from "@phosphor-icons/react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { hajiasalPath } from "@/lib/paths";
import { LAB_CERTIFICATE } from "@/lib/lab-certificate";
import { ProductGallery } from "../gallery/ProductGallery";
import { ProductAccordion } from "../shared/ProductAccordion";
import { StickyAddToCart } from "../purchase/StickyAddToCart";
import { WeightSelector } from "../purchase/WeightSelector";
import { RelatedProducts } from "../related/RelatedProducts";
import { ReviewsSection } from "../reviews/ReviewsSection";
import { useProductPurchase } from "../hooks/useProductPurchase";
import {
  buildProductAccordionItems,
  DEFAULT_SHIPPING_LABEL,
  DEFAULT_TRUST_TITLE,
} from "../lib/build-accordion-items";
import type { ProductDetailClientProps } from "../types";
import { getEffectiveWeightPrice } from "@/lib/products";

const featureBadges = [
  { icon: Leaf, label: "۱۰۰٪ طبیعی" },
  { icon: ShieldCheck, label: "بدون افزودنی" },
  {
    icon: Medal,
    label: "دارای گواهی",
    href: LAB_CERTIFICATE.href,
    downloadName: LAB_CERTIFICATE.downloadName,
  },
];

export function ProductDetailClient({
  product: initialProduct,
  relatedProducts,
  initialReviews,
}: ProductDetailClientProps) {
  const siteData = useSiteSettings();
  const {
    product,
    selectedWeight,
    setSelectedWeight,
    quantity,
    setQuantity,
    listPrice,
    salePrice,
    purchasable,
    maxQty,
    adding,
    addedFlash,
    handleAddToCart,
  } = useProductPurchase({ initialProduct });

  const accordionItems = buildProductAccordionItems(product);
  const shippingLabel = DEFAULT_SHIPPING_LABEL;
  const trustTitle = siteData.trustItems[0]?.title ?? DEFAULT_TRUST_TITLE;
  const addToCart = () => {
    void handleAddToCart();
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="order-1 min-w-0">
          <ProductGallery images={product.images} title={product.title} />
        </div>

        <div className="order-2 flex flex-col gap-6 lg:sticky lg:top-28 lg:self-start">
          <nav className="text-sm text-dim" aria-label="مسیر صفحه">
            <Link href={hajiasalPath("/shop")} className="hover:text-gold">
              {product.categoryLabel}
            </Link>
            <span className="mx-2 text-secondary">/</span>
            <span className="text-secondary">{product.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
            <span className="text-dim">{product.categoryLabel}</span>
            {product.isBestseller ? (
              <span className="text-gold">پرفروش</span>
            ) : null}
            {product.isNew && !product.isBestseller ? (
              <span className="text-primary/75">جدید</span>
            ) : null}
            {!purchasable ? (
              <span className="text-red-400/90">ناموجود</span>
            ) : null}
          </div>

          <h1 className="font-display text-3xl font-bold leading-tight text-primary text-balance md:text-4xl">
            {product.title}
          </h1>

          <RatingStars
            rating={product.rating}
            reviewCount={product.reviewCount}
            size="md"
          />

          <p className="max-w-md leading-relaxed text-secondary">
            {product.shortDescription}
          </p>

          <div className="flex flex-wrap gap-4">
            {featureBadges.map(({ icon: Icon, label, href, downloadName }) => {
              const inner = (
                <>
                  <Icon size={16} className="text-gold" weight="duotone" />
                  <span>{label}</span>
                </>
              );
              if (href) {
                return (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={downloadName}
                    title={LAB_CERTIFICATE.label}
                    className="flex items-center gap-2 text-sm text-secondary underline-offset-4 transition-colors hover:text-gold hover:underline"
                  >
                    {inner}
                  </a>
                );
              }
              return (
                <div
                  key={label}
                  className="flex items-center gap-2 text-sm text-secondary"
                >
                  {inner}
                </div>
              );
            })}
          </div>

          <PriceDisplay
            price={listPrice}
            discountPrice={salePrice < listPrice ? salePrice : undefined}
            size="lg"
          />

          {purchasable ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check size={16} weight="bold" />
              <span>موجود در انبار</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-red-400/90">
              <span>این محصول در حال حاضر موجود نیست</span>
            </div>
          )}

          <WeightSelector
            options={product.weightOptions}
            selected={selectedWeight}
            onChange={setSelectedWeight}
            getPrice={(option) => getEffectiveWeightPrice(product, option)}
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-xl bg-surface-elevated px-1">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={!purchasable}
                className="flex h-11 w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-40"
                aria-label="کاهش"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[2rem] text-center font-medium tabular-nums text-primary">
                {quantity.toLocaleString("fa-IR")}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(maxQty || 1, q + 1))
                }
                disabled={!purchasable || quantity >= maxQty}
                className="flex h-11 w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-40"
                aria-label="افزایش"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <Button
                size="lg"
                disabled={!purchasable || adding}
                onClick={addToCart}
                className="w-full min-w-[12rem] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ShoppingBag size={18} className="shrink-0" />
                <span className="truncate">
                  {!purchasable
                    ? "ناموجود"
                    : adding
                      ? "در حال بررسی..."
                      : addedFlash
                        ? "به سبد اضافه شد"
                        : "افزودن به سبد خرید"}
                </span>
              </Button>
            </div>
          </div>

          {/* Sentinel must sit next to main ATC so sticky only appears after it leaves the viewport */}
          <StickyAddToCart
            title={product.title}
            price={listPrice}
            discountPrice={salePrice < listPrice ? salePrice : undefined}
            inStock={purchasable}
            onAddToCart={addToCart}
            busy={adding}
          />

          <div className="flex flex-wrap gap-6 border-t border-border pt-4 text-xs text-secondary">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-gold" weight="duotone" />
              <span>{shippingLabel}</span>
            </div>
            <Link
              href={hajiasalPath("/authenticity")}
              className="flex items-center gap-2 transition-colors hover:text-gold"
            >
              <Shield size={14} className="text-gold" weight="duotone" />
              <span>{trustTitle}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-12 lg:max-w-none">
        <ProductAccordion items={accordionItems} title={null} />
      </div>

      <div className="mt-14">
        <ReviewsSection product={product} initialReviews={initialReviews} />
      </div>

      {relatedProducts.length > 0 ? (
        <RelatedProducts
          products={relatedProducts}
          category={product.category}
          categoryLabel={product.categoryLabel}
        />
      ) : null}
    </div>
  );
}
