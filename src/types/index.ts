export type ProductCategory =
  | "mountain"
  | "thyme"
  | "multifloral"
  | "royal-jelly"
  | "honeycomb"
  | "specialty"
  | "gift-set"
  | "distillates"
  | "rice"
  | "saffron";

export interface WeightOption {
  label: string;
  grams: number;
  price: number;
}

export type ProductApprovalStatus = "pending" | "approved" | "rejected";

export interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: ProductCategory;
  categoryLabel: string;
  images: string[];
  weightOptions: WeightOption[];
  discountPrice?: number;
  inStock: boolean;
  rating: number;
  reviewCount: number;
  isBestseller?: boolean;
  isNew?: boolean;
  ingredients?: string;
  shippingInfo?: string;
  createdAt?: string;
  /** When set, product is owned by an independent seller (not platform catalog). */
  sellerId?: string;
  approvalStatus?: ProductApprovalStatus;
  reviewNote?: string;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  weight: WeightOption;
  quantity: number;
}

export interface NavItem {
  id: string;
  label: string;
  href: string;
}

export interface CategoryItem {
  id: ProductCategory;
  label: string;
  description: string;
  image: string;
}

export interface TeamMember {
  name: string;
  role: string;
  bio: string;
  image?: string;
}

export interface BrandValue {
  title: string;
  description: string;
}

export interface GalleryImage {
  src: string;
  alt: string;
}

export interface TrustPageSection {
  heading: string;
  body: string;
}

export interface TrustPageContent {
  title: string;
  intro: string;
  sections: TrustPageSection[];
}

export interface SocialLinks {
  instagram?: string;
  whatsapp?: string;
}

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    description: string;
  };
  whatsappNumber?: string;
  social?: SocialLinks;
  nav: NavItem[];
  hero: {
    title: string;
    subtitle: string;
    cta: string;
    ctaHref: string;
    image: string;
  };
  couponHAJI10: {
    minOrder: number;
    percent: number;
  };
  /** @deprecated ارسال رایگان حذف شده؛ فقط برای سازگاری داده قدیمی */
  freeShippingThreshold?: number;
  shippingCost: number;
  milestones: Array<{
    year: string;
    title: string;
    description: string;
  }>;
  trustItems: Array<{
    id: string;
    title: string;
    description: string;
  }>;
  brandStory: {
    title: string;
    paragraphs: string[];
  };
  aboutPage: {
    paragraphs: string[];
  };
  team?: TeamMember[];
  values?: BrandValue[];
  gallery?: GalleryImage[];
  trustPages?: {
    authenticity: TrustPageContent;
    privacy: TrustPageContent;
    terms: TrustPageContent;
    shipping: TrustPageContent;
  };
  footer: {
    phone: string;
    email: string;
    address: string;
  };
  categories: CategoryItem[];
}

export type SortOption =
  | "popular"
  | "price-asc"
  | "price-desc"
  | "newest";

export interface ProductFilters {
  category?: ProductCategory | null;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  weightGrams?: number;
  sort?: SortOption;
  inStockOnly?: boolean;
}

export interface CheckoutFormData {
  fullName: string;
  phone: string;
  province: string;
  city: string;
  address: string;
  postalCode: string;
  notes?: string;
}

export interface CheckoutPayload {
  customer: CheckoutFormData;
  items: CartItem[];
  subtotal: number;
  shipping: number;
  total: number;
}

export interface CheckoutResponse {
  success: boolean;
  orderId: string;
  message: string;
}
