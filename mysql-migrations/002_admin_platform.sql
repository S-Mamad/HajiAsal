-- حاجی عسل — پلتفرم ادمین (RBAC + ماژول‌های جدید)
-- Additive only — MySQL/MariaDB. پس از 001_schema اجرا شود.

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS admin_users (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NULL,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(32) NOT NULL DEFAULT 'support',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY admin_users_email_uq (email),
  UNIQUE KEY admin_users_phone_uq (phone),
  KEY admin_users_role_idx (role),
  KEY admin_users_status_idx (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Expand admin_sessions with admin_user_id (nullable for legacy sessions)
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_sessions'
    AND COLUMN_NAME = 'admin_user_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE admin_sessions ADD COLUMN admin_user_id CHAR(36) NULL, ADD KEY admin_sessions_user_idx (admin_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Expand admin_audit_log
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'admin_audit_log'
    AND COLUMN_NAME = 'admin_user_id'
);
SET @sql := IF(
  @col_exists = 0,
  'ALTER TABLE admin_audit_log ADD COLUMN admin_user_id CHAR(36) NULL, ADD COLUMN ip_address VARCHAR(64) NULL, ADD KEY admin_audit_user_idx (admin_user_id)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS brands (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  logo TEXT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY brands_slug_uq (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Product catalog extensions
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND COLUMN_NAME = 'sku'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE products
    ADD COLUMN sku VARCHAR(64) NULL,
    ADD COLUMN brand_id VARCHAR(64) NULL,
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT ''active'',
    ADD COLUMN stock_qty INT NOT NULL DEFAULT 0,
    ADD COLUMN min_stock INT NOT NULL DEFAULT 0,
    ADD COLUMN discount_starts_at DATETIME(3) NULL,
    ADD COLUMN discount_ends_at DATETIME(3) NULL,
    ADD COLUMN weight_grams INT NULL,
    ADD COLUMN dimensions_json JSON NULL,
    ADD KEY products_sku_idx (sku),
    ADD KEY products_brand_idx (brand_id),
    ADD KEY products_status_idx (status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

CREATE TABLE IF NOT EXISTS article_categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY article_categories_slug_uq (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS articles (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  excerpt TEXT NULL,
  body MEDIUMTEXT NULL,
  cover_image TEXT NULL,
  category_id VARCHAR(64) NULL,
  tags JSON NULL,
  seo JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'draft',
  published_at DATETIME(3) NULL,
  author_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY articles_slug_uq (slug),
  KEY articles_status_idx (status),
  KEY articles_category_idx (category_id),
  CONSTRAINT articles_category_fk FOREIGN KEY (category_id) REFERENCES article_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media_assets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  alt_text VARCHAR(255) NULL,
  folder VARCHAR(120) NULL,
  uploaded_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY media_assets_mime_idx (mime_type),
  KEY media_assets_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS banners (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  image_url TEXT NOT NULL,
  link_url TEXT NULL,
  placement VARCHAR(64) NOT NULL DEFAULT 'home_slider',
  sort_order INT NOT NULL DEFAULT 0,
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY banners_placement_idx (placement),
  KEY banners_active_idx (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS cms_pages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body MEDIUMTEXT NULL,
  seo JSON NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'published',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY cms_pages_slug_uq (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_questions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  user_id CHAR(36) NULL,
  asker_name VARCHAR(255) NULL,
  question TEXT NOT NULL,
  answer TEXT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  answered_by CHAR(36) NULL,
  answered_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY product_questions_product_idx (product_id),
  KEY product_questions_status_idx (status),
  CONSTRAINT product_questions_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS support_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  subject VARCHAR(255) NOT NULL,
  customer_id CHAR(36) NULL,
  customer_name VARCHAR(255) NULL,
  customer_phone VARCHAR(32) NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  priority VARCHAR(16) NOT NULL DEFAULT 'normal',
  assigned_to CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY support_tickets_status_idx (status),
  KEY support_tickets_priority_idx (priority)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  sender_type VARCHAR(16) NOT NULL,
  sender_id CHAR(36) NULL,
  body TEXT NOT NULL,
  attachment_url TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ticket_messages_ticket_idx (ticket_id),
  CONSTRAINT ticket_messages_ticket_fk FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  channel VARCHAR(16) NOT NULL DEFAULT 'panel',
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  target_role VARCHAR(32) NULL,
  target_user_id CHAR(36) NULL,
  is_read TINYINT(1) NOT NULL DEFAULT 0,
  meta JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY notifications_channel_idx (channel),
  KEY notifications_read_idx (is_read),
  KEY notifications_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_wallets (
  user_id CHAR(36) NOT NULL PRIMARY KEY,
  balance INT NOT NULL DEFAULT 0,
  points INT NOT NULL DEFAULT 0,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  CONSTRAINT customer_wallets_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS wallet_transactions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  type VARCHAR(32) NOT NULL,
  amount INT NOT NULL,
  points_delta INT NOT NULL DEFAULT 0,
  note TEXT NULL,
  admin_user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY wallet_tx_user_idx (user_id),
  CONSTRAINT wallet_tx_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customer_admin_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  note TEXT NOT NULL,
  admin_user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY customer_notes_user_idx (user_id),
  CONSTRAINT customer_notes_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Review reply / moderation helpers
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_reviews' AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE product_reviews
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT ''pending'',
    ADD COLUMN admin_reply TEXT NULL,
    ADD COLUMN replied_at DATETIME(3) NULL,
    ADD KEY product_reviews_status_idx (status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Contact message status
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'contact_messages' AND COLUMN_NAME = 'status'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE contact_messages
    ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT ''new'',
    ADD COLUMN admin_reply TEXT NULL,
    ADD COLUMN replied_at DATETIME(3) NULL,
    ADD KEY contact_messages_status_idx (status)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Order refund helpers
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'refunded_at'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE orders
    ADD COLUMN refunded_at DATETIME(3) NULL,
    ADD COLUMN refund_note TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
