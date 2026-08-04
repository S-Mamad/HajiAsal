import type { SellerCapability } from "@/lib/seller/capabilities";
import { hajiasalPath } from "@/lib/paths";

export type HttpMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

export type SellerModuleEndpoint = {
  id: string;
  module: string;
  method: HttpMethod;
  path: string;
  /** Capability checked by gateSeller; null = auth-only (no capability). */
  capability: SellerCapability | null;
  /** When set, gateSellerAny accepts ANY of these (OR). Deny-tests must turn all off. */
  anyOfCapabilities?: SellerCapability[];
  importPath: string;
  body?: unknown;
  skipAllowedProbe?: boolean;
};

/**
 * Declarative catalog of gated seller API endpoints.
 * Auth route is intentionally excluded.
 */
export const SELLER_API_CATALOG: SellerModuleEndpoint[] = [
  {
    id: "dashboard.GET",
    module: "dashboard",
    method: "GET",
    path: "/api/seller/dashboard",
    capability: null,
    importPath: "@/app/api/seller/dashboard/route",
    skipAllowedProbe: true,
  },
  {
    id: "activity.GET",
    module: "activity",
    method: "GET",
    path: "/api/seller/activity",
    capability: null,
    importPath: "@/app/api/seller/activity/route",
  },
  {
    id: "search.GET",
    module: "search",
    method: "GET",
    path: "/api/seller/search?q=test",
    capability: null,
    importPath: "@/app/api/seller/search/route",
  },
  {
    id: "saved-filters.GET",
    module: "saved-filters",
    method: "GET",
    path: "/api/seller/saved-filters",
    capability: null,
    importPath: "@/app/api/seller/saved-filters/route",
  },
  {
    id: "saved-filters.POST",
    module: "saved-filters",
    method: "POST",
    path: "/api/seller/saved-filters",
    capability: null,
    importPath: "@/app/api/seller/saved-filters/route",
    body: { moduleKey: "products", name: "f1", payload: {} },
    skipAllowedProbe: true,
  },
  {
    id: "saved-filters.DELETE",
    module: "saved-filters",
    method: "DELETE",
    path: "/api/seller/saved-filters",
    capability: null,
    importPath: "@/app/api/seller/saved-filters/route",
    body: { id: "sf1" },
    skipAllowedProbe: true,
  },

  // Products
  {
    id: "products.GET",
    module: "products",
    method: "GET",
    path: "/api/seller/products",
    capability: "products.manage",
    anyOfCapabilities: ["products.manage", "print.export"],
    importPath: "@/app/api/seller/products/route",
  },
  {
    id: "products.POST",
    module: "products",
    method: "POST",
    path: "/api/seller/products",
    capability: "products.manage",
    importPath: "@/app/api/seller/products/route",
    body: {
      title: "عسل تست",
      category: "honey",
      weightOptions: [{ label: "1kg", grams: 1000, price: 100000 }],
    },
    skipAllowedProbe: true,
  },
  {
    id: "products.PATCH",
    module: "products",
    method: "PATCH",
    path: "/api/seller/products",
    capability: "products.manage",
    importPath: "@/app/api/seller/products/route",
    body: { productId: "p1", title: "updated" },
    skipAllowedProbe: true,
  },
  {
    id: "products.DELETE",
    module: "products",
    method: "DELETE",
    path: "/api/seller/products",
    capability: "products.manage",
    importPath: "@/app/api/seller/products/route",
    body: { productId: "p1" },
    skipAllowedProbe: true,
  },

  // Orders
  {
    id: "orders.GET",
    module: "orders",
    method: "GET",
    path: "/api/seller/orders",
    capability: "orders.manage",
    anyOfCapabilities: ["orders.manage", "print.export"],
    importPath: "@/app/api/seller/orders/route",
  },
  {
    id: "orders.PATCH",
    module: "orders",
    method: "PATCH",
    path: "/api/seller/orders",
    capability: "orders.manage",
    importPath: "@/app/api/seller/orders/route",
    body: { orderId: "o1", action: "confirm" },
    skipAllowedProbe: true,
  },
  {
    id: "orders.export.GET",
    module: "orders",
    method: "GET",
    path: "/api/seller/orders/export",
    capability: "orders.manage",
    importPath: "@/app/api/seller/orders/export/route",
  },

  // Inventory
  {
    id: "inventory.GET",
    module: "inventory",
    method: "GET",
    path: "/api/seller/inventory",
    capability: "inventory.manage",
    importPath: "@/app/api/seller/inventory/route",
  },
  {
    id: "inventory.PATCH",
    module: "inventory",
    method: "PATCH",
    path: "/api/seller/inventory",
    capability: "inventory.manage",
    importPath: "@/app/api/seller/inventory/route",
    body: { productId: "p1", delta: 1 },
    skipAllowedProbe: true,
  },

  // Customers
  {
    id: "customers.GET",
    module: "customers",
    method: "GET",
    path: "/api/seller/customers",
    capability: "customers.view",
    importPath: "@/app/api/seller/customers/route",
  },

  // Wallet / earnings
  {
    id: "wallet.GET",
    module: "wallet",
    method: "GET",
    path: "/api/seller/wallet",
    capability: "wallet.view",
    importPath: "@/app/api/seller/wallet/route",
  },
  {
    id: "wallet.POST",
    module: "wallet",
    method: "POST",
    path: "/api/seller/wallet",
    capability: "wallet.withdraw",
    importPath: "@/app/api/seller/wallet/route",
    body: { amount: 1000 },
    skipAllowedProbe: true,
  },
  {
    id: "earnings.GET",
    module: "earnings",
    method: "GET",
    path: "/api/seller/earnings",
    capability: "wallet.view",
    importPath: "@/app/api/seller/earnings/route",
  },

  // Reports
  {
    id: "reports.GET",
    module: "reports",
    method: "GET",
    path: "/api/seller/reports",
    capability: "reports.view",
    importPath: "@/app/api/seller/reports/route",
  },

  // Tickets
  {
    id: "tickets.GET",
    module: "tickets",
    method: "GET",
    path: "/api/seller/tickets",
    capability: "tickets.manage",
    importPath: "@/app/api/seller/tickets/route",
  },
  {
    id: "tickets.POST",
    module: "tickets",
    method: "POST",
    path: "/api/seller/tickets",
    capability: "tickets.manage",
    importPath: "@/app/api/seller/tickets/route",
    body: { subject: "کمک", body: "متن تیکت تست", category: "general" },
    skipAllowedProbe: true,
  },
  {
    id: "tickets.id.GET",
    module: "tickets",
    method: "GET",
    path: "/api/seller/tickets/t1",
    capability: "tickets.manage",
    importPath: "@/app/api/seller/tickets/[id]/route",
  },
  {
    id: "tickets.id.POST",
    module: "tickets",
    method: "POST",
    path: "/api/seller/tickets/t1",
    capability: "tickets.manage",
    importPath: "@/app/api/seller/tickets/[id]/route",
    body: { body: "پاسخ تست" },
    skipAllowedProbe: true,
  },

  // Notifications
  {
    id: "notifications.GET",
    module: "notifications",
    method: "GET",
    path: "/api/seller/notifications",
    capability: "notifications.view",
    importPath: "@/app/api/seller/notifications/route",
  },
  {
    id: "notifications.PATCH",
    module: "notifications",
    method: "PATCH",
    path: "/api/seller/notifications",
    capability: "notifications.view",
    importPath: "@/app/api/seller/notifications/route",
    body: { ids: ["n1"] },
    skipAllowedProbe: true,
  },

  // Reviews / QA
  {
    id: "reviews.GET",
    module: "reviews",
    method: "GET",
    path: "/api/seller/reviews",
    capability: "reviews.reply",
    importPath: "@/app/api/seller/reviews/route",
    skipAllowedProbe: true,
  },
  {
    id: "reviews.PATCH",
    module: "reviews",
    method: "PATCH",
    path: "/api/seller/reviews",
    capability: "reviews.reply",
    importPath: "@/app/api/seller/reviews/route",
    body: { reviewId: "r1", reply: "ممنون" },
    skipAllowedProbe: true,
  },
  {
    id: "qa.GET",
    module: "qa",
    method: "GET",
    path: "/api/seller/qa",
    capability: "qa.reply",
    importPath: "@/app/api/seller/qa/route",
    skipAllowedProbe: true,
  },
  {
    id: "qa.PATCH",
    module: "qa",
    method: "PATCH",
    path: "/api/seller/qa",
    capability: "qa.reply",
    importPath: "@/app/api/seller/qa/route",
    body: { questionId: "q1", answer: "بله" },
    skipAllowedProbe: true,
  },

  // Discounts
  {
    id: "discounts.GET",
    module: "discounts",
    method: "GET",
    path: "/api/seller/discounts",
    capability: "discounts.manage",
    importPath: "@/app/api/seller/discounts/route",
    skipAllowedProbe: true,
  },
  {
    id: "discounts.POST",
    module: "discounts",
    method: "POST",
    path: "/api/seller/discounts",
    capability: "discounts.manage",
    importPath: "@/app/api/seller/discounts/route",
    body: { code: "OFF10", type: "percent", value: 10 },
    skipAllowedProbe: true,
  },
  {
    id: "discounts.DELETE",
    module: "discounts",
    method: "DELETE",
    path: "/api/seller/discounts",
    capability: "discounts.manage",
    importPath: "@/app/api/seller/discounts/route",
    body: { id: "d1" },
    skipAllowedProbe: true,
  },

  // Profile
  {
    id: "profile.GET",
    module: "profile",
    method: "GET",
    path: "/api/seller/profile",
    capability: "profile.manage",
    importPath: "@/app/api/seller/profile/route",
  },
  {
    id: "profile.PATCH",
    module: "profile",
    method: "PATCH",
    path: "/api/seller/profile",
    capability: "profile.manage",
    importPath: "@/app/api/seller/profile/route",
    body: { shopName: "فروشگاه جدید" },
    skipAllowedProbe: true,
  },

  // Settings (shop hours / low-stock threshold)
  {
    id: "settings.GET",
    module: "settings",
    method: "GET",
    path: "/api/seller/settings",
    capability: "settings.manage",
    importPath: "@/app/api/seller/settings/route",
  },
  {
    id: "settings.PATCH",
    module: "settings",
    method: "PATCH",
    path: "/api/seller/settings",
    capability: "settings.manage",
    importPath: "@/app/api/seller/settings/route",
    body: { shopSettings: { lowStockThreshold: 8 } },
    skipAllowedProbe: true,
  },

  // Media
  {
    id: "media.GET",
    module: "media",
    method: "GET",
    path: "/api/seller/media",
    capability: "media.manage",
    importPath: "@/app/api/seller/media/route",
  },
  {
    id: "media.POST",
    module: "media",
    method: "POST",
    path: "/api/seller/media",
    capability: "media.manage",
    importPath: "@/app/api/seller/media/route",
    skipAllowedProbe: true,
  },
  {
    id: "media.DELETE",
    module: "media",
    method: "DELETE",
    path: "/api/seller/media",
    capability: "media.manage",
    importPath: "@/app/api/seller/media/route",
    body: { id: "m1" },
    skipAllowedProbe: true,
  },

  // Tools
  {
    id: "tools.GET",
    module: "tools",
    method: "GET",
    path: "/api/seller/tools?mode=template",
    capability: "tools.import_export",
    importPath: "@/app/api/seller/tools/route",
  },
  {
    id: "tools.POST",
    module: "tools",
    method: "POST",
    path: "/api/seller/tools",
    capability: "tools.import_export",
    importPath: "@/app/api/seller/tools/route",
    body: { rows: [{ title: "عسل", category: "honey", price: 100000 }] },
    skipAllowedProbe: true,
  },
];

/** Panel nav paths used by smoke E2E and nav capability tests. */
export const SELLER_NAV_PATHS = [
  hajiasalPath("/seller/dashboard"),
  hajiasalPath("/seller/products"),
  hajiasalPath("/seller/orders"),
  hajiasalPath("/seller/inventory"),
  hajiasalPath("/seller/customers"),
  hajiasalPath("/seller/wallet"),
  hajiasalPath("/seller/reports"),
  hajiasalPath("/seller/tickets"),
  hajiasalPath("/seller/notifications"),
  hajiasalPath("/seller/reviews"),
  hajiasalPath("/seller/qa"),
  hajiasalPath("/seller/discounts"),
  hajiasalPath("/seller/profile"),
  hajiasalPath("/seller/media"),
  hajiasalPath("/seller/print-export"),
  hajiasalPath("/seller/tools"),
  hajiasalPath("/seller/settings"),
  hajiasalPath("/seller/activity"),
] as const;
