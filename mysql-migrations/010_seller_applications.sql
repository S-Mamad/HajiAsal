-- 010_seller_applications.sql — public seller onboarding applications + KYC docs

CREATE TABLE IF NOT EXISTS seller_applications (
  id CHAR(36) NOT NULL PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  national_id VARCHAR(10) NOT NULL,
  birth_date DATE NOT NULL,
  address TEXT NOT NULL,
  bank_card VARCHAR(16) NOT NULL,
  products_intro TEXT NOT NULL,
  national_id_front_url VARCHAR(512) NOT NULL,
  national_id_back_url VARCHAR(512) NULL,
  commitment_letter_url VARCHAR(512) NOT NULL,
  status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  terms_accepted_at DATETIME(3) NOT NULL,
  review_note TEXT NULL,
  reviewed_at DATETIME(3) NULL,
  reviewed_by VARCHAR(64) NULL,
  seller_id VARCHAR(64) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  KEY seller_app_status_idx (status),
  KEY seller_app_phone_idx (phone),
  KEY seller_app_national_idx (national_id),
  KEY seller_app_created_idx (created_at),
  KEY seller_app_seller_idx (seller_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
