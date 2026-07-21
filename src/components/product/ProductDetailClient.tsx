"use client";

import { useState } from "react";
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
import type { Product, WeightOption } from "@/types";
import type { Review } from "@/lib/server/reviews";
import { getEffectiveWeightPrice } from "@/lib/products";
import { ProductGallery } from "@/components/product/ProductGallery";
import { WeightSelector } from "@/components/product/WeightSelector";
import { ProductAccordion } from "@/components/product/ProductAccordion";
import { StickyAddToCart } from "@/components/product/StickyAddToCart";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { ReviewsSection } from "@/components/product/ReviewsSection";
import { Button } from "@/components/ui/Button";
import { PriceDisplay } from "@/components/ui/PriceDisplay";
import { RatingStars } from "@/components/ui/RatingStars";
import { useCartStore } from "@/store/cart";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { hajiasalPath } from "@/lib/paths";

const featureBadges = [
  { icon: Leaf, label: "۱۰۰٪ طبیعی" },
  { icon: ShieldCheck, label: "بدون افزودنی" },
  { icon: Medal, label: "دارای گواهی" },
];

interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
  initialReviews?: Review[];
}

export function ProductDetailClient({
  product,
  relatedProducts,
  initialReviews,
}: ProductDetailClientProps) {
  const siteData = useSiteSettings();
  const addItem = useCartStore((s) => s.addItem);
  const [selectedWeight, setSelectedWeight] = useState<WeightOption>(
    product.weightOptions[0],
  );
  const [quantity, setQuantity] = useState(1);
  const [addedFlash, setAddedFlash] = useState(false);

  const listPrice = selectedWeight.price;
  const salePrice = getEffectiveWeightPrice(product, selectedWeight);

  const handleAddToCart = () => {
    addItem(
      {
        productId: product.id,
        slug: product.slug,
        title: product.title,
        image: product.images[0],
        weight: {
          ...selectedWeight,
          price: salePrice,
        },
      },
      quantity,
    );
    setAddedFlash(true);
    window.setTimeout(() => setAddedFlash(false), 1200);
  };

  const accordionItems = [
    {
      title: "توضیحات",
      content: product.longDescription,
    },
    ...(product.ingredients
      ? [{ title: "ترکیبات", content: product.ingredients }]
      : []),
    ...(product.shippingInfo
      ? [{ title: "ارسال", content: product.shippingInfo }]
      : []),
  ];

  const shippingLabel = "ارسال سراسری با بسته‌بندی ایمن";

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-16">
      <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-12">
        <div className="order-2 flex flex-col gap-6 lg:order-2">
          <nav className="text-sm text-dim">
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
            {!product.inStock ? (
              <span className="text-red-400/90">ناموجود</span>
            ) : null}
          </div>

          <h1 className="font-[family-name:var(--font-lalezar)] text-3xl font-bold leading-tight text-primary md:text-4xl">
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
            {featureBadges.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 text-sm text-secondary"
              >
                <Icon size={16} className="text-gold" />
                <span>{label}</span>
              </div>
            ))}
          </div>

          <PriceDisplay
            price={listPrice}
            discountPrice={salePrice < listPrice ? salePrice : undefined}
            size="lg"
          />

          {product.inStock ? (
            <div className="flex items-center gap-2 text-sm text-success">
              <Check size={16} weight="bold" />
              <span>موجود در انبار</span>
            </div>
          ) : null}

          <WeightSelector
            options={product.weightOptions}
            selected={selectedWeight}
            onChange={setSelectedWeight}
          />

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-xl bg-surface-elevated px-1">
              <button
                type="button"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="flex h-11 w-11 items-center justify-center text-secondary hover:text-primary"
                aria-label="کاهش"
              >
                <Minus size={16} />
              </button>
              <span className="min-w-[2rem] text-center font-medium text-primary">
                {quantity.toLocaleString("fa-IR")}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(quantity + 1)}
                className="flex h-11 w-11 items-center justify-center text-secondary hover:text-primary"
                aria-label="افزایش"
              >
                <Plus size={16} />
              </button>
            </div>

            <div className="min-w-0 flex-1">
              <Button
                size="lg"
                disabled={!product.inStock}
                onClick={handleAddToCart}
                className="w-full min-w-[12rem]"
              >
                <ShoppingBag size={18} className="shrink-0" />
                <span className="truncate">
                  {!product.inStock
                    ? "ناموجود"
                    : addedFlash
                      ? "به سبد اضافه شد"
                      : "افزودن به سبد خرید"}
                </span>
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 border-t border-border pt-4 text-xs text-secondary">
            <div className="flex items-center gap-2">
              <Truck size={14} className="text-gold" />
              <span>{shippingLabel}</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield size={14} className="text-gold" />
              <span>{siteData.trustItems[0]?.title ?? "ضمانت کیفیت"}</span>
            </div>
          </div>
        </div>

        <div className="order-1 lg:order-1">
          <ProductGallery images={product.images} title={product.title} />
        </div>
      </div>

      <div className="mt-12 lg:max-w-none">
        <ProductAccordion items={accordionItems} />
      </div>

      <div className="mt-14">
        <ReviewsSection product={product} initialReviews={initialReviews} />
      </div>

      {relatedProducts.length > 0 ? (
        <RelatedProducts products={relatedProducts} />
      ) : null}

      <StickyAddToCart
        title={product.title}
        price={listPrice}
        discountPrice={salePrice < listPrice ? salePrice : undefined}
        inStock={product.inStock}
        onAddToCart={handleAddToCart}
      />
    </div>
  );
}
