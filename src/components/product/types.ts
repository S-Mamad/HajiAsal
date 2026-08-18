import type { ComponentType } from "react";
import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import type { Product, ProductCategory, WeightOption } from "@/types";
import type { ProductImageFit } from "@/lib/product-image";
import type { Review } from "@/lib/server/reviews";

export type ProductUiIcon = ComponentType<PhosphorIconProps>;

export interface ProductCardProps {
  product: Product;
}

export interface ProductGridProps {
  products: Product[];
  /** Extra classes on the outer wrapper (e.g. wishlist dock clearance). */
  className?: string;
}

export interface WeightSelectorProps {
  options: WeightOption[];
  selected: WeightOption;
  onChange: (option: WeightOption) => void;
  /** Display price per option (sale price). Falls back to option.price. */
  getPrice?: (option: WeightOption) => number;
  disabled?: boolean;
}

export interface ProductGalleryProps {
  images: string[];
  title: string;
  imageFits?: Record<string, ProductImageFit>;
}

export interface AccordionItem {
  title: string;
  content: string;
}

export interface ProductAccordionProps {
  items: AccordionItem[];
  /** Section heading. Pass `null` to hide (e.g. FAQ page already has its own title). */
  title?: string | null;
  /** Accessible name when the visible heading is hidden. */
  ariaLabel?: string;
  className?: string;
}

export interface StickyAddToCartProps {
  title: string;
  price: number;
  discountPrice?: number;
  inStock: boolean;
  onAddToCart: () => void;
  busy?: boolean;
}

export interface RelatedProductsProps {
  products: Product[];
  category?: ProductCategory;
  categoryLabel?: string;
}

export interface ReviewsSectionProps {
  product: Product;
  initialReviews?: Review[];
}

export interface ProductDetailClientProps {
  product: Product;
  relatedProducts: Product[];
  initialReviews?: Review[];
}

export interface ProductFeatureBadge {
  icon: ProductUiIcon;
  label: string;
  href?: string;
  downloadName?: string;
}

export interface ProductBreadcrumbProps {
  category: ProductCategory;
  categoryLabel: string;
  title: string;
}

export interface ProductInfoHeaderProps {
  product: Product;
  purchasable: boolean;
}

export interface ProductPurchasePanelProps {
  product: Product;
  selectedWeight: WeightOption;
  onWeightChange: (option: WeightOption) => void;
  quantity: number;
  onQuantityChange: (quantity: number) => void;
  listPrice: number;
  salePrice: number;
  purchasable: boolean;
  maxQty: number;
  adding: boolean;
  addedFlash: boolean;
  onAddToCart: () => void;
  shippingLabel: string;
  trustTitle: string;
}
