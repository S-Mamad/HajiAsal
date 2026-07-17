-- Seed فروشندگان دمو (رمزها با sellers.json هماهنگ‌اند؛ در Production با SELLER_PASSWORD_S1/S2 جایگزین می‌شوند)

INSERT INTO sellers (
  id, shop_name, owner_name, phone, password_hash, city, status, is_demo, joined_at, commission_percent
) VALUES
  (
    's1',
    'زنبورداری البرز',
    'حسین محمدی',
    '09121111111',
    'scrypt$NDQMuyBRdq7P76kLdlhMuQ$SfXCRHqm8tbFSl0GoWWoO1LeXqJsSf518UvPya-D4x1st9fOvfnFBmvVH9NCYK8zcnHgoCyhmHvRszpLP7_Ihg',
    'کرج',
    'active',
    1,
    '2025-01-10 00:00:00.000',
    10
  ),
  (
    's2',
    'شهد زاگرس',
    'مریم کریمی',
    '09122222222',
    'scrypt$aQh7j2hX3V92VATGRohYsA$Mr6ghcsjPhhvfmfetT8BlS1HPRxqPKEOMxfgxZKs5taXT_5ydbIHAUOSLtGvEUZK9nBPPGB70BB1FEOwENC4cA',
    'شیراز',
    'active',
    1,
    '2025-03-22 00:00:00.000',
    10
  )
ON DUPLICATE KEY UPDATE
  shop_name = VALUES(shop_name),
  owner_name = VALUES(owner_name),
  phone = VALUES(phone),
  status = VALUES(status);
