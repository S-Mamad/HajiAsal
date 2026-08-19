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

export type ProductStatus = "active" | "draft" | "archived" | "disabled";

export type CustomFieldType =
  | "text"
  | "number"
  | "date"
  | "select"
  | "image"
  | "table"
  | "repeater";

export interface ProductSeo {
  title?: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  robots?: string;
  focusKeyword?: string;
  faq?: Array<{ question: string; answer: string }>;
}

export interface ProductFieldDefinition {
  id: string;
  key: string;
  label: string;
  type: CustomFieldType;
  options?: { choices?: string[]; columns?: string[] };
  validation?: {
    min?: number;
    max?: number;
    maxLength?: number;
    pattern?: string;
  };
  scope: "product" | "category";
  categoryId?: string | null;
  sortOrder: number;
  isRequired: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductRevision {
  id: string;
  productId: string;
  actor?: string | null;
  snapshot: Product;
  diff?: Record<string, unknown> | null;
  note?: string | null;
  createdAt: string;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  longDescription: string;
  category: ProductCategory;
  categoryLabel: string;
  images: string[];
  /** Per-image pan/zoom inside the square storefront frame. Keyed by image URL. */
  imageFits?: Record<string, { scale: number; x: number; y: number }>;
  weightOptions: WeightOption[];
  discountPrice?: number;
  inStock: boolean;
  stockQty?: number;
  status?: ProductStatus;
  sku?: string;
  brandId?: string | null;
  rating: number;
  reviewCount: number;
  /** Page views in the last 24h — drives PLP FOMO badge when >= 50. */
  viewsLast24h?: number;
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
  deletedAt?: string | null;
  publishedAt?: string | null;
  seo?: ProductSeo;
  customFields?: Record<string, unknown>;
}

export type CartItemAvailability = "ok" | "price_changed" | "out_of_stock";

export interface CartItem {
  productId: string;
  slug: string;
  title: string;
  image: string;
  /** Snapshot of the product square crop at add-to-cart time. */
  imageFit?: { scale: number; x: number; y: number };
  weight: WeightOption;
  quantity: number;
  /** Snapshot for client-side stock guards */
  inStock?: boolean;
  stockQty?: number;
  /** Unit price when first added (for price-change UX). */
  priceAtAdd?: number;
  availability?: CartItemAvailability;
  /** Seller ownership at order time (wallet credits must use this, not live catalog). */
  sellerId?: string;
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
  /** نمایش در صفحه اصلی؛ پیش‌فرض true */
  showOnHome?: boolean;
  /** عنوان جایگزین در صفحه اصلی */
  homeLabel?: string;
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
  eitaa?: string;
  telegram?: string;
  rubika?: string;
  bale?: string;
  soroush?: string;
  /** پیام پشتیبانی ایتا (جایگزین واتساپ) */
  supportEitaa?: string;
  /** پیام پشتیبانی تلگرام (جایگزین واتساپ) */
  supportTelegram?: string;
  /** @deprecated حذف شده؛ فقط برای سازگاری داده قدیمی */
  whatsapp?: string;
}

export interface SiteConfig {
  brand: {
    name: string;
    tagline: string;
    description: string;
  };
  /** @deprecated حذف شده؛ فقط برای سازگاری داده قدیمی */
  whatsappNumber?: string;
  social?: SocialLinks;
  nav: NavItem[];
  hero: {
    title: string;
    subtitle: string;
    cta: string;
    ctaHref: string;
    image: string;
    /** اختیاری؛ نسخه عمودی برای موبایل */
    imageMobile?: string;
  };
  /** تنظیمات اسلایدر صفحه اصلی (autoplay و …) */
  homeSlider?: {
    autoplay?: boolean;
    intervalMs?: number;
  };
  /** بخش‌های قابل کنترل صفحه اصلی */
  homeSections?: {
    amazingDeals?: {
      enabled?: boolean;
      title?: string;
      subtitle?: string;
      limit?: number;
      sort?: "discount-desc" | "popular" | "newest";
    };
    sellerBanner?: {
      enabled?: boolean;
      title?: string;
      description?: string;
      image?: string;
      ctaText?: string;
      ctaHref?: string;
    };
  };
  couponHAJI10: {
    minOrder: number;
    percent: number;
  };
  /** آستانه ارسال رایگان (تومان). ۰ یا خالی = غیرفعال */
  freeShippingThreshold?: number;
  /** پست پیشتاز (تومان) */
  shippingCost: number;
  /** پست ویژه (تومان). اگر نباشد: shippingCost + ۳۵۰۰۰ */
  expressShippingCost?: number;
  /** تحویل حضوری (تومان). پیش‌فرض ۰ */
  pickupShippingCost?: number;
  /** اگر false باشد ارسال رایگان شامل پست ویژه نمی‌شود */
  freeShippingIncludesExpress?: boolean;
  /** نوار ارسال رایگان و پیشنهاد لحظه آخر در سبد */
  cartPromo?: {
    freeShippingBarEnabled?: boolean;
    freeShippingRemainingText?: string;
    freeShippingUnlockedText?: string;
    impulseEnabled?: boolean;
    impulseTitle?: string;
    impulseMode?: "popular" | "manual";
    impulseProductIds?: string[];
    impulseLimit?: number;
  };
  /** متن کادر جستجو و چیپ‌های پیشنهادی فروشگاه */
  searchUi?: {
    placeholder?: string;
    suggestionsTitle?: string;
    hint?: string;
    suggestions?: string[];
  };
  /** متن‌های ویجت پشتیبانی شناور (FAB) */
  supportWidgetCopy?: {
    welcomeLineLive?: string;
    welcomeLineQueue?: string;
    welcomeLineAfterHours?: string;
    statusLive?: string;
    statusQueue?: string;
    statusAfterHours?: string;
    statusOffline?: string;
    liveGreeting?: string;
    offlineOperatorGreeting?: string;
    afterHoursGreeting?: string;
  };
  /** متن‌های ثابت صفحات فروشگاه (فوتر، سبد، تماس، …) */
  pageCopy?: {
    home?: Partial<import("@/lib/page-copy").PageCopySettings["home"]>;
    faq?: Partial<import("@/lib/page-copy").PageCopySettings["faq"]>;
    contact?: Partial<import("@/lib/page-copy").PageCopySettings["contact"]>;
    footer?: Partial<
      Omit<
        import("@/lib/page-copy").PageCopySettings["footer"],
        "quickLinks" | "legalLinks" | "mobileQuickLinks"
      >
    > & {
      quickLinks?: import("@/lib/page-copy").PageCopyLink[];
      legalLinks?: import("@/lib/page-copy").PageCopyLink[];
      mobileQuickLinks?: import("@/lib/page-copy").PageCopyLink[];
    };
    cart?: Partial<import("@/lib/page-copy").PageCopySettings["cart"]>;
    auth?: Partial<import("@/lib/page-copy").PageCopySettings["auth"]>;
    social?: Partial<import("@/lib/page-copy").PageCopySettings["social"]>;
    support?: Partial<
      Omit<
        import("@/lib/page-copy").PageCopySettings["support"],
        "quickPrompts"
      >
    > & {
      quickPrompts?: import("@/lib/page-copy").PageCopyQuickPrompt[];
    };
    tickets?: {
      statusHints?: Partial<
        import("@/lib/page-copy").PageCopySettings["tickets"]["statusHints"]
      >;
    };
  };
  shippingMethods?: {
    standard?: { label?: string; description?: string; eta?: string };
    express?: { label?: string; description?: string; eta?: string };
    pickup?: { label?: string; description?: string; eta?: string };
  };
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
    image?: string;
    paragraphs: string[];
  };
  aboutPage: {
    paragraphs: string[];
  };
  faq?: Array<{ id: string; question: string; answer: string }>;
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

export type AmazingDealsSort = "discount-desc" | "popular" | "newest";

export interface ProductFilters {
  category?: ProductCategory | null;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  weightGrams?: number;
  sort?: SortOption;
  inStockOnly?: boolean;
  onSaleOnly?: boolean;
  bestsellerOnly?: boolean;
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
