-- Ticket chat enterprise features (additive)
SET NAMES utf8mb4;

-- support_tickets extras
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'support_tickets' AND COLUMN_NAME = 'locked_by');
SET @sql := IF(@col = 0,
  'ALTER TABLE support_tickets
    ADD COLUMN locked_by CHAR(36) NULL,
    ADD COLUMN locked_at DATETIME(3) NULL,
    ADD COLUMN department VARCHAR(64) NULL DEFAULT ''general'',
    ADD COLUMN last_read_by_customer_at DATETIME(3) NULL,
    ADD COLUMN last_read_by_admin_at DATETIME(3) NULL,
    ADD COLUMN csat_score TINYINT NULL,
    ADD COLUMN csat_at DATETIME(3) NULL,
    ADD COLUMN meta JSON NULL,
    ADD COLUMN guest_email VARCHAR(255) NULL,
    ADD KEY support_tickets_locked_idx (locked_by),
    ADD KEY support_tickets_dept_idx (department)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- ticket_messages extras
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'ticket_messages' AND COLUMN_NAME = 'client_message_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE ticket_messages
    ADD COLUMN client_message_id VARCHAR(64) NULL,
    ADD COLUMN reply_to_id CHAR(36) NULL,
    ADD COLUMN is_internal TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN edited_at DATETIME(3) NULL,
    ADD COLUMN deleted_at DATETIME(3) NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL,
    ADD COLUMN attachment_mime VARCHAR(120) NULL,
    ADD UNIQUE KEY ticket_messages_client_uq (ticket_id, client_message_id),
    ADD KEY ticket_messages_reply_idx (reply_to_id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- seller_tickets extras
SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seller_tickets' AND COLUMN_NAME = 'locked_by');
SET @sql := IF(@col = 0,
  'ALTER TABLE seller_tickets
    ADD COLUMN locked_by CHAR(36) NULL,
    ADD COLUMN locked_at DATETIME(3) NULL,
    ADD COLUMN last_read_by_seller_at DATETIME(3) NULL,
    ADD COLUMN last_read_by_admin_at DATETIME(3) NULL,
    ADD COLUMN csat_score TINYINT NULL,
    ADD COLUMN csat_at DATETIME(3) NULL,
    ADD COLUMN meta JSON NULL',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

SET @col := (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'seller_ticket_messages' AND COLUMN_NAME = 'client_message_id');
SET @sql := IF(@col = 0,
  'ALTER TABLE seller_ticket_messages
    ADD COLUMN client_message_id VARCHAR(64) NULL,
    ADD COLUMN reply_to_id CHAR(36) NULL,
    ADD COLUMN is_internal TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN edited_at DATETIME(3) NULL,
    ADD COLUMN deleted_at DATETIME(3) NULL,
    ADD COLUMN attachment_name VARCHAR(255) NULL,
    ADD COLUMN attachment_mime VARCHAR(120) NULL,
    ADD UNIQUE KEY seller_ticket_msg_client_uq (ticket_id, client_message_id)',
  'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

CREATE TABLE IF NOT EXISTS ticket_canned_responses (
  id CHAR(36) NOT NULL PRIMARY KEY,
  shortcut VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY ticket_canned_shortcut_uq (shortcut)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_typing (
  ticket_id CHAR(36) NOT NULL,
  channel VARCHAR(16) NOT NULL,
  actor_id VARCHAR(64) NOT NULL,
  actor_type VARCHAR(16) NOT NULL,
  updated_at DATETIME(3) NOT NULL,
  PRIMARY KEY (ticket_id, channel, actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_blocks (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id VARCHAR(64) NULL,
  ip_address VARCHAR(64) NULL,
  reason VARCHAR(255) NULL,
  created_by CHAR(36) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  KEY ticket_blocks_user_idx (user_id),
  KEY ticket_blocks_ip_idx (ip_address)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
