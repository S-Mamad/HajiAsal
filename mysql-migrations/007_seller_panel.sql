-- 007_seller_panel.sql — additive seller panel foundation + module tables
-- MySQL/MariaDB only. Uses INFORMATION_SCHEMA guards like 002_admin_platform.sql.

-- ---------------------------------------------------------------------------
-- sellers profile / capabilities / settings
-- ---------------------------------------------------------------------------
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sellers' AND COLUMN_NAME = 'logo'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE sellers
    ADD COLUMN logo TEXT NULL,
    ADD COLUMN banner TEXT NULL,
    ADD COLUMN address TEXT NULL,
    ADD COLUMN contact_phone VARCHAR(32) NULL,
    ADD COLUMN bank_name VARCHAR(120) NULL,
    ADD COLUMN bank_sheba VARCHAR(34) NULL,
    ADD COLUMN bank_card VARCHAR(32) NULL,
    ADD COLUMN capabilities JSON NULL,
    ADD COLUMN shop_settings JSON NULL,
    ADD COLUMN notification_prefs JSON NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- products.stock_qty / status come from 002_admin_platform when applied
UPDATE products
SET stock_qty = IF(in_stock = 1, GREATEST(COALESCE(stock_qty, 0), 1), 0)
WHERE COALESCE(stock_qty, 0) = 0;

-- ---------------------------------------------------------------------------
-- seller activity
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_activity_logs (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NULL,
  entity_id VARCHAR(64) NULL,
  meta JSON NULL,
  ip VARCHAR(64) NULL,
  user_agent VARCHAR(512) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY seller_activity_seller_idx (seller_id),
  KEY seller_activity_created_idx (created_at),
  KEY seller_activity_action_idx (action),
  CONSTRAINT seller_activity_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_notifications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL DEFAULT 'system',
  title VARCHAR(255) NOT NULL,
  body TEXT NULL,
  href VARCHAR(512) NULL,
  meta JSON NULL,
  read_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY seller_notif_seller_idx (seller_id),
  KEY seller_notif_read_idx (seller_id, read_at),
  KEY seller_notif_created_idx (created_at),
  CONSTRAINT seller_notif_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_saved_filters (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  module_key VARCHAR(64) NOT NULL,
  name VARCHAR(120) NOT NULL,
  payload JSON NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY seller_filters_seller_module_idx (seller_id, module_key),
  CONSTRAINT seller_filters_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS inventory_movements (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  product_id VARCHAR(64) NOT NULL,
  delta INT NOT NULL,
  qty_after INT NOT NULL,
  reason VARCHAR(120) NOT NULL DEFAULT 'adjust',
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY inv_mov_seller_idx (seller_id),
  KEY inv_mov_product_idx (product_id),
  KEY inv_mov_created_idx (created_at),
  CONSTRAINT inv_mov_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE,
  CONSTRAINT inv_mov_product_fk FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_wallet_ledger (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  type VARCHAR(64) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'available',
  reference_type VARCHAR(64) NULL,
  reference_id VARCHAR(64) NULL,
  note TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY seller_ledger_seller_idx (seller_id),
  KEY seller_ledger_status_idx (seller_id, status),
  KEY seller_ledger_created_idx (created_at),
  CONSTRAINT seller_ledger_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_withdrawals (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  amount INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  bank_sheba VARCHAR(34) NULL,
  bank_card VARCHAR(32) NULL,
  note TEXT NULL,
  admin_note TEXT NULL,
  reviewed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY seller_withdraw_seller_idx (seller_id),
  KEY seller_withdraw_status_idx (status),
  CONSTRAINT seller_withdraw_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_tickets (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  category VARCHAR(64) NOT NULL DEFAULT 'general',
  priority VARCHAR(32) NOT NULL DEFAULT 'normal',
  status VARCHAR(32) NOT NULL DEFAULT 'open',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY seller_tickets_seller_idx (seller_id),
  KEY seller_tickets_status_idx (status),
  CONSTRAINT seller_tickets_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_ticket_messages (
  id CHAR(36) NOT NULL PRIMARY KEY,
  ticket_id CHAR(36) NOT NULL,
  sender_type VARCHAR(32) NOT NULL,
  body TEXT NOT NULL,
  attachment_url TEXT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY seller_ticket_msg_ticket_idx (ticket_id),
  CONSTRAINT seller_ticket_msg_ticket_fk FOREIGN KEY (ticket_id) REFERENCES seller_tickets(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_media (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes INT NOT NULL DEFAULT 0,
  url TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY seller_media_seller_idx (seller_id),
  CONSTRAINT seller_media_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seller_discounts (
  id CHAR(36) NOT NULL PRIMARY KEY,
  seller_id VARCHAR(64) NOT NULL,
  code VARCHAR(64) NOT NULL,
  type VARCHAR(32) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  min_order INT NULL,
  max_uses INT NULL,
  used_count INT NOT NULL DEFAULT 0,
  starts_at DATETIME(3) NULL,
  ends_at DATETIME(3) NULL,
  product_ids JSON NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY seller_discounts_code_uq (seller_id, code),
  KEY seller_discounts_seller_idx (seller_id),
  CONSTRAINT seller_discounts_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS order_seller_notes (
  id CHAR(36) NOT NULL PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL,
  seller_id VARCHAR(64) NOT NULL,
  note TEXT NOT NULL,
  tags JSON NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  UNIQUE KEY order_seller_notes_uq (order_id, seller_id),
  KEY order_seller_notes_seller_idx (seller_id),
  CONSTRAINT order_seller_notes_seller_fk FOREIGN KEY (seller_id) REFERENCES sellers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- seller reply / report on reviews
SET @col_exists := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'product_reviews' AND COLUMN_NAME = 'seller_reply'
);
SET @sql := IF(@col_exists = 0,
  'ALTER TABLE product_reviews
    ADD COLUMN seller_reply TEXT NULL,
    ADD COLUMN seller_replied_at DATETIME(3) NULL,
    ADD COLUMN seller_report_note TEXT NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
