-- Hero slider slide fields + homepage category display
ALTER TABLE banners
  ADD COLUMN subtitle TEXT NULL AFTER title,
  ADD COLUMN cta_text VARCHAR(120) NULL AFTER link_url,
  ADD COLUMN cta_href TEXT NULL AFTER cta_text,
  ADD COLUMN image_mobile_url TEXT NULL AFTER image_url,
  ADD COLUMN is_default TINYINT(1) NOT NULL DEFAULT 0 AFTER is_active;

ALTER TABLE categories
  ADD COLUMN show_on_home TINYINT(1) NOT NULL DEFAULT 1 AFTER sort_order,
  ADD COLUMN home_label VARCHAR(255) NULL AFTER show_on_home;
