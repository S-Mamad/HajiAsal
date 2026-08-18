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
import { AddToCartSheet } from "@/components/cart/AddToCartSheet";
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
    addSheetOpen,
    setAddSheetOpen,
    handleAddToCart,
  } = useProductPurchase({ initialProduct });

  const accordionItems = buildProductAccordionItems(product);
  const shippingLabel = DEFAULT_SHIPPING_LABEL;
  const trustTitle = siteData.trustItems[0]?.title ?? DEFAULT_TRUST_TITLE;
  const addToCart = () => {
    void handleAddToCart();
  };

  return (
    <div
      className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16"
      data-support-in-stock={purchasable ? "1" : "0"}
      data-support-product={product.slug}
    >
      <div className="grid items-start gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="order-1 min-w-0">
          <ProductGallery
            images={product.images}
            title={product.title}
            imageFits={product.imageFits}
          />
        </div>

        <div className="order-2 flex flex-col gap-4 text-start lg:sticky lg:top-28 lg:self-start">
          <nav
            className="flex items-center gap-1.5 text-[13px] text-dim"
            aria-label="مسیر صفحه"
          >
            <Link href={hajiasalPath("/shop")} className="hover:text-gold">
              فروشگاه
            </Link>
            <span className="text-secondary/40" aria-hidden>
              /
            </span>
            <Link
              href={hajiasalPath(
                `/shop?category=${encodeURIComponent(product.category)}`,
              )}
              className="hover:text-gold"
            >
              {product.categoryLabel}
            </Link>
          </nav>

          {(product.isBestseller || product.isNew || !purchasable) && (
            <div className="flex items-center gap-2 text-[12px]">
              {product.isBestseller ? (
                <span className="rounded-md bg-gold/15 px-2 py-0.5 font-medium text-gold">
                  پرفروش
                </span>
              ) : null}
              {product.isNew && !product.isBestseller ? (
                <span className="rounded-md bg-primary/8 px-2 py-0.5 font-medium text-primary/80">
                  جدید
                </span>
              ) : null}
              {!purchasable ? (
                <span className="rounded-md bg-red-500/10 px-2 py-0.5 font-medium text-red-500">
                  ناموجود
                </span>
              ) : null}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <h1 className="font-display text-[1.75rem] font-bold leading-snug text-pretty text-primary md:text-4xl">
              {product.title}
            </h1>

            {product.reviewCount > 0 ? (
              <RatingStars
                rating={product.rating}
                reviewCount={product.reviewCount}
                size="md"
              />
            ) : null}

            {product.shortDescription ? (
              <p className="text-[15px] leading-7 text-secondary">
                {product.shortDescription}
              </p>
            ) : null}
          </div>

          <ul className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            {featureBadges.map(({ icon: Icon, label, href, downloadName }) => {
              const inner = (
                <>
                  <Icon
                    size={16}
                    className="shrink-0 text-gold"
                    weight="duotone"
                  />
                  <span>{label}</span>
                </>
              );
              const className =
                "inline-flex items-center gap-2 text-[13px] leading-none text-secondary";
              if (href) {
                return (
                  <li key={label}>
                    <a
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      download={downloadName}
                      title={LAB_CERTIFICATE.label}
                      className={`${className} transition-colors hover:text-gold`}
                    >
                      {inner}
                    </a>
                  </li>
                );
              }
              return (
                <li key={label} className={className}>
                  {inner}
                </li>
              );
            })}
          </ul>

          <div className="flex flex-col gap-4 border-t border-border pt-4">
            <div className="space-y-1.5">
              <PriceDisplay
                price={listPrice}
                discountPrice={salePrice < listPrice ? salePrice : undefined}
                size="lg"
              />
              {purchasable ? (
                <p className="flex items-center gap-1.5 text-[13px] leading-none text-success">
                  <Check size={15} weight="bold" className="shrink-0" />
                  موجود در انبار
                </p>
              ) : (
                <p className="text-[13px] leading-none text-red-500">
                  این محصول در حال حاضر موجود نیست
                </p>
              )}
            </div>

            <WeightSelector
              options={product.weightOptions}
              selected={selectedWeight}
              onChange={setSelectedWeight}
              getPrice={(option) => getEffectiveWeightPrice(product, option)}
              disabled={!purchasable}
            />

            <div className="flex h-12 items-stretch gap-2">
              <div className="flex h-12 shrink-0 items-center rounded-xl border border-border bg-surface-elevated">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={!purchasable}
                  className="flex h-12 w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-40"
                  aria-label="کاهش"
                >
                  <Minus size={16} />
                </button>
                <span className="min-w-[1.75rem] text-center text-sm font-medium tabular-nums leading-none text-primary">
                  {quantity.toLocaleString("fa-IR")}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setQuantity((q) => Math.min(maxQty || 1, q + 1))
                  }
                  disabled={!purchasable || quantity >= maxQty}
                  className="flex h-12 w-11 items-center justify-center text-secondary transition-colors hover:text-primary disabled:opacity-40"
                  aria-label="افزایش"
                >
                  <Plus size={16} />
                </button>
              </div>

              <Button
                disabled={!purchasable || adding}
                onClick={addToCart}
                className="h-12 min-w-0 flex-1 px-4 text-sm md:h-12"
              >
                <ShoppingBag size={18} className="shrink-0" />
                <span className="truncate">
                  {!purchasable
                    ? "ناموجود"
                    : adding
                      ? "در حال بررسی..."
                      : addedFlash
                        ? "به سبد اضافه شد"
                        : "افزودن به سبد"}
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

          <div className="flex flex-col gap-2 border-t border-border pt-4 text-[13px] leading-none text-secondary sm:flex-row sm:flex-wrap sm:gap-x-5 sm:gap-y-2">
            <div className="flex items-center gap-2">
              <Truck size={15} className="shrink-0 text-gold" weight="duotone" />
              <span>{shippingLabel}</span>
            </div>
            <Link
              href={hajiasalPath("/authenticity")}
              className="flex items-center gap-2 transition-colors hover:text-gold"
            >
              <Shield size={15} className="shrink-0 text-gold" weight="duotone" />
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

      <AddToCartSheet
        open={addSheetOpen}
        onClose={() => setAddSheetOpen(false)}
        productTitle={product.title}
      />
    </div>
  );
}
