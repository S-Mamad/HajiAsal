-- حاجی عسل — دسته‌بندی‌ها (phpMyAdmin: بعد از 001 و 002 Paste کنید)
SET NAMES utf8mb4;

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('mountain', 'mountain', 'عسل کوهستان', 0)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('thyme', 'thyme', 'عسل آویشن', 1)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('multifloral', 'multifloral', 'عسل چهل‌گیاه', 2)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('royal-jelly', 'royal-jelly', 'ژل رویال', 3)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('honeycomb', 'honeycomb', 'شهد با موم', 4)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('specialty', 'specialty', 'عسل‌های خاص', 5)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('gift-set', 'gift-set', 'ست هدیه', 6)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('distillates', 'distillates', 'عرقیجات', 7)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('rice', 'rice', 'برنج', 8)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

INSERT INTO categories (id, slug, name, sort_order)
VALUES ('saffron', 'saffron', 'زعفران', 9)
ON DUPLICATE KEY UPDATE slug=VALUES(slug), name=VALUES(name), sort_order=VALUES(sort_order);

