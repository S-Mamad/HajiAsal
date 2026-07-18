# کوئری MySQL — فقط Copy/Paste در phpMyAdmin
# دامنه: https://hajiasal.ir

## قبل از SQL (در cPanel)

1. **MySQL Databases** → یک دیتابیس بساز (مثلاً `hajiasal_db`)
2. یک **User** بساز + رمز قوی
3. User را به Database وصل کن → **ALL PRIVILEGES**

یادداشت کن:
- اسم کامل دیتابیس (مثلاً `cpanel_hajiasal_db`)
- اسم کامل یوزر (مثلاً `cpanel_hajiasal`)
- رمز

---

## ترتیب Paste در phpMyAdmin

phpMyAdmin → دیتابیس خودت را انتخاب کن → تب **SQL** → کل فایل را Paste → **Go**

| ترتیب | فایل | کار |
|---|---|---|
| 1 | `001_schema.sql` | ساخت همه جداول |
| 2 | `002_admin_platform.sql` | RBAC ادمین + برند/مقاله/رسانه/بنر/تیکت/... |
| 3 | `002_seed_sellers.sql` | دو فروشنده اولیه |
| 4 | `003-006_seed_all_shop_data.sql` | دسته‌ها + ۵۰ محصول + کوپن + تنظیمات سایت |

**یا** به‌جای فایل ۳، تک‌تک:
- `003_seed_categories.sql`
- `004_seed_products.sql`
- `005_seed_coupons.sql`
- `006_seed_site_settings.sql`

---

## بعد از SQL — چک

```sql
SELECT COUNT(*) AS products FROM products;
SELECT COUNT(*) AS coupons FROM coupons;
SELECT id, shop_name, phone FROM sellers;
SELECT `key` FROM site_settings;
```

باید ببینی:
- products ≈ **50**
- coupons = **3**
- sellers = **2**
- site_settings = **hajiasal**

---

## .env روی هاست

```env
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_DATABASE=اسم_کامل_دیتابیس
MYSQL_USER=اسم_کامل_یوزر
MYSQL_PASSWORD=رمز
```

---

## نکته

- هر فایل را **یک‌جا** Paste کن، نه تک‌خط
- اگر خطا «table already exists» دیدی، یعنی قبلاً اجرا شده؛ برای شروع تازه دیتابیس خالی بساز
- Supabase / Postgres لازم نیست
