-- حاجی عسل — ارتقای ماژول مدیریت محصولات ادمین
-- پس از 002_admin_platform اجرا شود. اگر Duplicate column دیدید همان دستور را رد کنید.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

ALTER TABLE products ADD COLUMN deleted_at DATETIME(3) NULL AFTER reviewed_at;
ALTER TABLE products ADD COLUMN published_at DATETIME(3) NULL AFTER deleted_at;
ALTER TABLE products ADD COLUMN custom_fields JSON NULL AFTER seo;

UPDATE products
SET published_at = COALESCE(published_at, created_at)
WHERE status = 'active' AND published_at IS NULL;

ALTER TABLE products ADD INDEX products_deleted_idx (deleted_at);
ALTER TABLE products ADD INDEX products_status_deleted_idx (status, deleted_at);

CREATE TABLE IF NOT EXISTS product_field_definitions (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  field_key VARCHAR(120) NOT NULL,
  label VARCHAR(255) NOT NULL,
  field_type VARCHAR(32) NOT NULL,
  options JSON NULL,
  validation_rules JSON NULL,
  scope VARCHAR(32) NOT NULL DEFAULT 'product',
  category_id VARCHAR(64) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_required TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY product_fields_key_scope_uq (field_key, scope, category_id),
  KEY product_fields_category_idx (category_id),
  KEY product_fields_sort_idx (sort_order),
  CONSTRAINT product_fields_category_fk
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_revisions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  actor VARCHAR(64) NULL,
  snapshot JSON NOT NULL,
  diff_json JSON NULL,
  note VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY product_revisions_product_idx (product_id, created_at),
  CONSTRAINT product_revisions_product_fk
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
