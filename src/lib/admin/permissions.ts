export type AdminRole =
  | "super_admin"
  | "support"
  | "warehouse"
  | "content";

export type AdminPermission =
  | "dashboard.view"
  | "products.view"
  | "products.create"
  | "products.edit"
  | "products.edit_price"
  | "products.publish"
  | "products.delete"
  | "products.bulk"
  | "products.import_export"
  | "products.manage_fields"
  | "categories.view"
  | "categories.manage"
  | "brands.view"
  | "brands.manage"
  | "orders.view"
  | "orders.edit"
  | "orders.refund"
  | "orders.print"
  | "customers.view"
  | "customers.edit"
  | "inventory.view"
  | "inventory.edit"
  | "sellers.view"
  | "sellers.manage"
  | "reviews.view"
  | "reviews.moderate"
  | "coupons.view"
  | "coupons.manage"
  | "messages.view"
  | "messages.manage"
  | "newsletter.view"
  | "newsletter.manage"
  | "articles.view"
  | "articles.manage"
  | "media.view"
  | "media.manage"
  | "banners.view"
  | "banners.manage"
  | "pages.view"
  | "pages.manage"
  | "qa.view"
  | "qa.manage"
  | "tickets.view"
  | "tickets.manage"
  | "notifications.view"
  | "notifications.manage"
  | "reports.view"
  | "reports.export"
  | "settings.view"
  | "settings.edit"
  | "logs.view"
  | "admin_users.view"
  | "admin_users.manage"
  | "content.view"
  | "content.manage";

const ALL_PERMISSIONS: AdminPermission[] = [
  "dashboard.view",
  "products.view",
  "products.create",
  "products.edit",
  "products.edit_price",
  "products.publish",
  "products.delete",
  "products.bulk",
  "products.import_export",
  "products.manage_fields",
  "categories.view",
  "categories.manage",
  "brands.view",
  "brands.manage",
  "orders.view",
  "orders.edit",
  "orders.refund",
  "orders.print",
  "customers.view",
  "customers.edit",
  "inventory.view",
  "inventory.edit",
  "sellers.view",
  "sellers.manage",
  "reviews.view",
  "reviews.moderate",
  "coupons.view",
  "coupons.manage",
  "messages.view",
  "messages.manage",
  "newsletter.view",
  "newsletter.manage",
  "articles.view",
  "articles.manage",
  "media.view",
  "media.manage",
  "banners.view",
  "banners.manage",
  "pages.view",
  "pages.manage",
  "qa.view",
  "qa.manage",
  "tickets.view",
  "tickets.manage",
  "notifications.view",
  "notifications.manage",
  "reports.view",
  "reports.export",
  "settings.view",
  "settings.edit",
  "logs.view",
  "admin_users.view",
  "admin_users.manage",
  "content.view",
  "content.manage",
];

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[] | "*"> = {
  super_admin: "*",
  support: [
    "dashboard.view",
    "orders.view",
    "orders.edit",
    "orders.print",
    "customers.view",
    "customers.edit",
    "reviews.view",
    "reviews.moderate",
    "messages.view",
    "messages.manage",
    "qa.view",
    "qa.manage",
    "tickets.view",
    "tickets.manage",
    "notifications.view",
    "products.view",
  ],
  warehouse: [
    "dashboard.view",
    "products.view",
    "products.edit",
    "products.bulk",
    "inventory.view",
    "inventory.edit",
    "orders.view",
    "orders.edit",
    "orders.print",
    "categories.view",
    "brands.view",
  ],
  content: [
    "dashboard.view",
    "articles.view",
    "articles.manage",
    "banners.view",
    "banners.manage",
    "pages.view",
    "pages.manage",
    "media.view",
    "media.manage",
    "categories.view",
    "categories.manage",
    "brands.view",
    "brands.manage",
    "content.view",
    "content.manage",
    "reviews.view",
    "products.view",
    "products.edit",
    "products.manage_fields",
  ],
};

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "مدیر کل",
  support: "پشتیبان",
  warehouse: "انباردار",
  content: "محتوا",
};

export function isAdminRole(value: string): value is AdminRole {
  return (
    value === "super_admin" ||
    value === "support" ||
    value === "warehouse" ||
    value === "content"
  );
}

export function can(
  role: AdminRole | string | null | undefined,
  permission: AdminPermission,
): boolean {
  if (!role || !isAdminRole(role)) return false;
  const perms = ROLE_PERMISSIONS[role];
  if (perms === "*") return true;
  return perms.includes(permission);
}

export function permissionsForRole(role: AdminRole): AdminPermission[] {
  const perms = ROLE_PERMISSIONS[role];
  if (perms === "*") return [...ALL_PERMISSIONS];
  return [...perms];
}

export function listAllPermissions(): AdminPermission[] {
  return [...ALL_PERMISSIONS];
}
