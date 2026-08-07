/**
 * Public Product module API.
 *
 * Layout (reset):
 * - catalog/   ProductCard, ProductGrid
 * - gallery/   ProductGallery
 * - purchase/  WeightSelector, StickyAddToCart, ProductPurchasePanel
 * - pdp/       detail page composer + header pieces
 * - related/   RelatedProducts
 * - reviews/   ReviewsSection
 * - shared/    ProductAccordion
 * - hooks/     useProductPurchase
 * - lib/       accordion helpers
 */
export type {
  AccordionItem,
  ProductAccordionProps,
  ProductBreadcrumbProps,
  ProductCardProps,
  ProductDetailClientProps,
  ProductFeatureBadge,
  ProductGalleryProps,
  ProductGridProps,
  ProductInfoHeaderProps,
  ProductPurchasePanelProps,
  ProductUiIcon,
  RelatedProductsProps,
  ReviewsSectionProps,
  StickyAddToCartProps,
  WeightSelectorProps,
} from "./types";

export { ProductCard } from "./catalog/ProductCard";
export { ProductGrid } from "./catalog/ProductGrid";
export { ProductGallery } from "./gallery/ProductGallery";
export { WeightSelector } from "./purchase/WeightSelector";
export { StickyAddToCart } from "./purchase/StickyAddToCart";
export { ProductPurchasePanel } from "./purchase/ProductPurchasePanel";
export { ProductAccordion } from "./shared/ProductAccordion";
export { RelatedProducts } from "./related/RelatedProducts";
export { ReviewsSection } from "./reviews/ReviewsSection";
export { ProductDetailClient } from "./pdp/ProductDetailClient";
export { ProductBreadcrumb } from "./pdp/ProductBreadcrumb";
export { ProductInfoHeader } from "./pdp/ProductInfoHeader";
export {
  ProductFeatureBadges,
  PRODUCT_FEATURE_BADGES,
} from "./pdp/ProductFeatureBadges";
export { useProductPurchase } from "./hooks/useProductPurchase";
export {
  buildProductAccordionItems,
  DEFAULT_SHIPPING_LABEL,
  DEFAULT_TRUST_TITLE,
} from "./lib/build-accordion-items";
