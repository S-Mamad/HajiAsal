-- حاجی عسل — کوپن‌ها
SET NAMES utf8mb4;

INSERT INTO coupons (code, type, value, min_order, max_discount, label, active, used_count)
VALUES (
  'HAJI10',
  'percent',
  10,
  300000,
  150000,
  '۱۰٪ تخفیف اولین خرید',
  1,
  0
)
ON DUPLICATE KEY UPDATE
  type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
  max_discount=VALUES(max_discount), label=VALUES(label), active=VALUES(active);

INSERT INTO coupons (code, type, value, min_order, max_discount, label, active, used_count)
VALUES (
  'ASAL50',
  'fixed',
  50000,
  400000,
  NULL,
  '۵۰ هزار تومان تخفیف',
  1,
  0
)
ON DUPLICATE KEY UPDATE
  type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
  max_discount=VALUES(max_discount), label=VALUES(label), active=VALUES(active);

INSERT INTO coupons (code, type, value, min_order, max_discount, label, active, used_count)
VALUES (
  'VIP20',
  'percent',
  20,
  800000,
  300000,
  '۲۰٪ تخفیف ویژه',
  1,
  0
)
ON DUPLICATE KEY UPDATE
  type=VALUES(type), value=VALUES(value), min_order=VALUES(min_order),
  max_discount=VALUES(max_discount), label=VALUES(label), active=VALUES(active);

