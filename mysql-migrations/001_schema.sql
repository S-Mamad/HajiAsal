-- حاجی عسل — اسکیمای کامل MySQL / MariaDB
-- در phpMyAdmin یا MySQL هاست یک‌بار اجرا کنید (دیتابیس خالی)

SET NAMES utf8mb4;
SET time_zone = '+00:00';

CREATE TABLE IF NOT EXISTS profiles (
  id CHAR(36) NOT NULL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  full_name VARCHAR(255) NULL,
  email VARCHAR(255) NULL,
  newsletter_opt_in TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY profiles_phone_uq (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_addresses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(120) NULL,
  province VARCHAR(120) NOT NULL,
  city VARCHAR(120) NOT NULL,
  address TEXT NOT NULL,
  postal_code VARCHAR(20) NOT NULL,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT user_addresses_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE,
  KEY user_addresses_user_id_idx (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_wishlists (
  user_id CHAR(36) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (user_id, product_id),
  CONSTRAINT user_wishlists_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS otp_challenges (
  id CHAR(36) NOT NULL PRIMARY KEY,
  phone VARCHAR(32) NOT NULL,
  code_hash VARCHAR(255) NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY otp_challenges_phone_idx (phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sellers (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  shop_name VARCHAR(255) NOT NULL,
  owner_name VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  password_hash TEXT NOT NULL,
  city VARCHAR(120) NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  is_demo TINYINT(1) NOT NULL DEFAULT 0,
  notes TEXT NULL,
  commission_percent DECIMAL(10,2) NOT NULL DEFAULT 10,
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  reviewed_at DATETIME(3) NULL,
  review_note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY sellers_phone_uq (phone),
  KEY sellers_status_idx (status),
  KEY sellers_joined_idx (joined_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(120) NOT NULL,
  name VARCHAR(255) NOT NULL,
  image TEXT NULL,
  description TEXT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY categories_slug_uq (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  slug VARCHAR(160) NOT NULL,
  title VARCHAR(255) NOT NULL,
  short_description TEXT NULL,
  description MEDIUMTEXT NULL,
  category_id VARCHAR(64) NULL,
  images JSON NOT NULL,
  weight_options JSON NOT NULL,
  discount_price DECIMAL(12,2) NULL,
  in_stock TINYINT(1) NOT NULL DEFAULT 1,
  featured TINYINT(1) NOT NULL DEFAULT 0,
  bestseller TINYINT(1) NOT NULL DEFAULT 0,
  rating DECIMAL(4,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  seo JSON NULL,
  honey_meta JSON NULL,
  seller_id VARCHAR(64) NULL,
  approval_status VARCHAR(32) NOT NULL DEFAULT 'approved',
  review_note TEXT NULL,
  submitted_at DATETIME(3) NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY products_slug_uq (slug),
  KEY products_category_idx (category_id),
  KEY products_seller_idx (seller_id),
  KEY products_approval_idx (approval_status),
  CONSTRAINT products_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
  CONSTRAINT products_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  status VARCHAR(64) NOT NULL DEFAULT 'pending_payment',
  payment_method VARCHAR(64) NOT NULL DEFAULT 'cod',
  user_id CHAR(36) NULL,
  customer JSON NOT NULL,
  items JSON NOT NULL,
  subtotal INT NOT NULL,
  shipping INT NOT NULL DEFAULT 0,
  discount INT NOT NULL DEFAULT 0,
  total INT NOT NULL,
  coupon_code VARCHAR(64) NULL,
  tracking_code VARCHAR(64) NULL,
  shipping_method VARCHAR(64) NULL,
  admin_note TEXT NULL,
  status_timeline JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY orders_tracking_uq (tracking_code),
  KEY orders_status_idx (status),
  KEY orders_created_idx (created_at),
  KEY orders_user_id_idx (user_id),
  CONSTRAINT orders_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id CHAR(36) NOT NULL PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  subscribed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY newsletter_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS contact_messages (
  id VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  source VARCHAR(64) DEFAULT 'hajiasal',
  read_at DATETIME(3) NULL,
  replied_at DATETIME(3) NULL,
  admin_note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS product_reviews (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  author VARCHAR(255) NOT NULL,
  rating INT NOT NULL,
  comment TEXT NOT NULL,
  verified TINYINT(1) NOT NULL DEFAULT 0,
  approved TINYINT(1) DEFAULT 0,
  admin_reply TEXT NULL,
  user_id CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY product_reviews_product_idx (product_id),
  CONSTRAINT product_reviews_user_fk FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  token_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  ip_address VARCHAR(64) NULL,
  user_agent TEXT NULL,
  UNIQUE KEY admin_sessions_token_uq (token_hash),
  KEY admin_sessions_expires_idx (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_login_attempts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ip_address VARCHAR(64) NOT NULL,
  attempted_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  success TINYINT(1) NOT NULL DEFAULT 0,
  KEY admin_login_ip_idx (ip_address, attempted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id CHAR(36) NOT NULL PRIMARY KEY,
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(64) NULL,
  payload JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY admin_audit_created_idx (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS coupons (
  code VARCHAR(64) NOT NULL PRIMARY KEY,
  type VARCHAR(16) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  min_order DECIMAL(12,2) NOT NULL DEFAULT 0,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  max_discount DECIMAL(12,2) NULL,
  label VARCHAR(255) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL,
  variant_key VARCHAR(120) NULL,
  delta INT NOT NULL,
  reason TEXT NULL,
  admin_note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  CONSTRAINT inventory_logs_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS site_settings (
  `key` VARCHAR(64) NOT NULL PRIMARY KEY,
  value JSON NOT NULL,
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  expires_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  UNIQUE KEY seller_sessions_token_uq (token_hash),
  KEY seller_sessions_seller_idx (seller_id),
  KEY seller_sessions_expires_idx (expires_at),
  CONSTRAINT seller_sessions_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
