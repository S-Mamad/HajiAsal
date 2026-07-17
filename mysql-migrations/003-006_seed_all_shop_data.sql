-- ============================================================
-- حاجی عسل — همه داده‌های فروشگاه (یک‌جا Paste کنید)
-- ترتیب کلی روی هاست:
--   1) 001_schema.sql
--   2) 002_seed_sellers.sql
--   3) این فایل (003 تا 006 یکجا)
-- ============================================================
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


INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p001',
  'asal-koohestan-alborz',
  'عسل کوهستان البرز',
  'عسل طبیعی از ارتفاعات البرز با طعم ملایم و عطر گل‌های کوهی',
  'این عسل از کندوهای سنتی در ارتفاعات البرز برداشت می‌شود. رنگ کهربایی روشن و بافت نرم آن نشان‌دهنده خلوص و کیفیت بالاست. مناسب مصرف روزانه و تقویت سیستم ایمنی.',
  'mountain',
  '["/images/hajiasal/products/p001.jpg","/images/hajiasal/products/p001-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":285000},{"label":"۱ کیلوگرم","grams":1000,"price":520000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  128,
  '{"ingredients":"۱۰۰٪ عسل طبیعی کوهستان","shippingInfo":"ارسال در بسته‌بندی ضدضربه ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p002',
  'asal-koohestan-lorestan',
  'عسل کوهی لرستان',
  'عسل وحشی از دامنه‌های زاگرس با طعم قوی و طبیعی',
  'عسل کوهی لرستان از گیاهان بومی منطقه تغذیه می‌شود و طعمی متمایز و عمیق دارد. برای علاقه‌مندان به عسل‌های پرطعم و اصیل ایرانی ایده‌آل است.',
  'mountain',
  '["/images/hajiasal/products/p002.jpg","/images/hajiasal/products/p002-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":310000},{"label":"۱ کیلوگرم","grams":1000,"price":580000}]',
  NULL,
  1,
  0,
  1,
  4.8,
  94,
  '{"ingredients":"۱۰۰٪ عسل طبیعی کوهی","shippingInfo":"ارسال سردخانه‌ای در فصل گرم سال"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p003',
  'asal-koohestan-mazandaran',
  'عسل کوهستان مازندران',
  'عسل معطر از جنگل‌های هیرکانی شمال ایران',
  'برداشت از مناطق جنگلی مازندران با تنوع گل‌های وحشی. این عسل عطر ملایم و طعم شیرین متعادل دارد و برای صبحانه و دمنوش عالی است.',
  'mountain',
  '["/images/hajiasal/products/p003.jpg","/images/hajiasal/products/p003-alt.jpg"]',
  '[{"label":"۳۰۰ گرم","grams":300,"price":195000},{"label":"۷۰۰ گرم","grams":700,"price":395000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  67,
  '{"ingredients":"۱۰۰٪ عسل طبیعی","shippingInfo":"ارسال سراسری با بسته‌بندی ایمن"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p004',
  'asal-koohestan-kerman',
  'عسل کوهستان کرمان',
  'عسل خشک و غلیظ از ارتفاعات جنوب شرق',
  'عسل کوهستان کرمان به دلیل آب‌وهوای خشک، غلظت بالایی دارد و طعمی متفاوت از عسل‌های شمالی ارائه می‌دهد. مناسب مصرف مستقیم و طب سنتی.',
  'mountain',
  '["/images/hajiasal/products/p004.jpg","/images/hajiasal/products/p004-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":275000},{"label":"۱ کیلوگرم","grams":1000,"price":495000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  45,
  '{"ingredients":"۱۰۰٪ عسل طبیعی کوهستان","shippingInfo":"ارسال در سراسر کشور"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p005',
  'asal-koohestan-ardabil',
  'عسل کوهستان اردبیل',
  'عسل سبلان با کیفیت ممتاز و رنگ طلایی',
  'از دامنه‌های سبلان برداشت شده و یکی از معروف‌ترین عسل‌های کوهستانی شمال غرب است. بافت کرمی و طعم متعادل برای تمام سنین مناسب است.',
  'mountain',
  '["/images/hajiasal/products/p005.jpg","/images/hajiasal/products/p005-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":295000},{"label":"۱ کیلوگرم","grams":1000,"price":545000}]',
  NULL,
  0,
  0,
  0,
  4.9,
  112,
  '{"ingredients":"۱۰۰٪ عسل طبیعی","shippingInfo":"موجودی محدود، پیش‌سفارش فعال"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p006',
  'asal-avishan-sabalan',
  'عسل آویشن سبلان',
  'عسل آویشن خالص با عطر قوی و خواص درمانی',
  'عسل آویشن یکی از گران‌ترین و باکیفیت‌ترین عسل‌های ایران است. از گل آویشن کوهستانی تغذیه می‌شود و برای سرفه، سرماخوردگی و تقویت عمومی بدن توصیه می‌شود.',
  'thyme',
  '["/images/hajiasal/products/p006.jpg","/images/hajiasal/products/p006-alt.jpg"]',
  '[{"label":"۲۵۰ گرم","grams":250,"price":385000},{"label":"۵۰۰ گرم","grams":500,"price":720000}]',
  NULL,
  1,
  0,
  1,
  5,
  203,
  '{"ingredients":"۱۰۰٪ عسل آویشن طبیعی","shippingInfo":"بسته‌بندی ویژه با جعبه چوبی"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p007',
  'asal-avishan-organic',
  'عسل آویشن ارگانیک',
  'گواهی ارگانیک، بدون آفت‌کش و افزودنی',
  'این عسل از کندوهای ارگانیک در ارتفاعات آذربایجان برداشت می‌شود. تمام مراحل تولید تحت نظارت و با گواهی معتبر ارگانیک انجام می‌گیرد.',
  'thyme',
  '["/images/hajiasal/products/p007.jpg","/images/hajiasal/products/p007-alt.jpg"]',
  '[{"label":"۳۰۰ گرم","grams":300,"price":450000},{"label":"۶۰۰ گرم","grams":600,"price":850000}]',
  NULL,
  1,
  1,
  0,
  4.9,
  87,
  '{"ingredients":"۱۰۰٪ عسل آویشن ارگانیک","shippingInfo":"ارسال با بیمه کامل"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p008',
  'asal-avishan-kurdistan',
  'عسل آویشن کردستان',
  'عسل آویشن از مراتع کردستان با طعم اصیل',
  'برداشت سنتی از زنبورداران بومی کردستان. عطر آویشن کوهستانی و طعم ملایم-تلخ این عسل آن را برای مصرف‌کنندگان حرفه‌ای جذاب کرده است.',
  'thyme',
  '["/images/hajiasal/products/p008.jpg","/images/hajiasal/products/p008-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":680000},{"label":"۱ کیلوگرم","grams":1000,"price":1250000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  56,
  '{"ingredients":"۱۰۰٪ عسل آویشن","shippingInfo":"ارسال ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p009',
  'asal-avishan-premium',
  'عسل آویشن ممتاز',
  'درجه یک صادراتی با آزمایشگاه تأیید شده',
  'بالاترین درجه کیفیت عسل آویشن با گزارش آزمایشگاه معتبر. مناسب هدیه و مصرف لوکس. بسته‌بندی شیشه‌ای درب‌دار با جعبه هدیه.',
  'thyme',
  '["/images/hajiasal/products/p009.jpg","/images/hajiasal/products/p009-alt.jpg"]',
  '[{"label":"۲۵۰ گرم","grams":250,"price":420000}]',
  380000,
  1,
  0,
  0,
  4.9,
  34,
  '{"ingredients":"۱۰۰٪ عسل آویشن ممتاز","shippingInfo":"ارسال اکسپرس در تهران"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p010',
  'asal-chehel-giah',
  'عسل چهل‌گیاه',
  'ترکیب گل‌های وحشی با طعم متعادل و عطر دلنشین',
  'عسل چهل‌گیاه از تغذیه زنبور بر روی انواع گل‌های وحشی به دست می‌آید. طعم متعادل و رنگ کهربایی آن محبوب‌ترین انتخاب مشتریان است.',
  'multifloral',
  '["/images/hajiasal/products/p010.jpg","/images/hajiasal/products/p010-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":245000},{"label":"۱ کیلوگرم","grams":1000,"price":450000}]',
  NULL,
  1,
  0,
  1,
  4.7,
  156,
  '{"ingredients":"۱۰۰٪ عسل چهل‌گیاه","shippingInfo":"ارسال استاندارد"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p011',
  'asal-bahar',
  'عسل بهار',
  'عسل بهاره با رنگ روشن و طعم شیرین ملایم',
  'برداشت بهاری از کندوها با شکوفه‌های تازه. این عسل برای کودکان و افرادی که طعم ملایم را ترجیح می‌دهند ایده‌آل است.',
  'multifloral',
  '["/images/hajiasal/products/p011.jpg","/images/hajiasal/products/p011-alt.jpg"]',
  '[{"label":"۴۰۰ گرم","grams":400,"price":210000},{"label":"۸۰۰ گرم","grams":800,"price":385000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  78,
  '{"ingredients":"۱۰۰٪ عسل بهار","shippingInfo":"ارسال در سراسر کشور"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p012',
  'asal-taame',
  'عسل تابستانه',
  'عسل تابستان با غلظت بالا و طعم غنی',
  'برداشت تابستانی با تنوع گل‌های فصلی. غلظت بالاتر و طعم قوی‌تر نسبت به عسل بهاری دارد.',
  'multifloral',
  '["/images/hajiasal/products/p012.jpg","/images/hajiasal/products/p012-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":235000},{"label":"۱ کیلوگرم","grams":1000,"price":430000}]',
  NULL,
  1,
  0,
  0,
  4.5,
  42,
  '{"ingredients":"۱۰۰٪ عسل طبیعی","shippingInfo":"ارسال ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p013',
  'asal-paeizi',
  'عسل پاییزه',
  'عسل پاییزی تیره با طعم عمیق و ماندگار',
  'آخرین برداشت فصل با بیشترین غلظت و مواد معدنی. رنگ تیره‌تر و طعم قوی‌تر برای علاقه‌مندان به عسل پرطعم.',
  'multifloral',
  '["/images/hajiasal/products/p013.jpg","/images/hajiasal/products/p013-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":255000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  38,
  '{"ingredients":"۱۰۰٪ عسل پاییزه","shippingInfo":"موجودی فصلی محدود"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p014',
  'asal-giyahane-vahshi',
  'عسل گیاهان وحشی',
  'از مراتع بدون کشت، کاملاً طبیعی',
  'زنبورها تنها از گیاهان وحشی تغذیه می‌شوند. هیچ کشت انسانی در منطقه وجود ندارد و عسل کاملاً ارگانیک است.',
  'multifloral',
  '["/images/hajiasal/products/p014.jpg","/images/hajiasal/products/p014-alt.jpg"]',
  '[{"label":"۳۵۰ گرم","grams":350,"price":265000},{"label":"۷۰۰ گرم","grams":700,"price":480000}]',
  NULL,
  1,
  1,
  0,
  4.8,
  61,
  '{"ingredients":"۱۰۰٪ عسل گیاهان وحشی","shippingInfo":"ارسال با بسته‌بندی اکو"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p015',
  'jel-royal-khales',
  'ژل رویال خالص',
  'ژل رویال تازه منجمد با بالاترین خلوص',
  'ژل رویال خالص با خلوص ۹۹٪ از کندوهای منتخب. سرشار از پروتئین، ویتامین B و اسیدهای آمینه. برای تقویت انرژی و سیستم ایمنی.',
  'royal-jelly',
  '["/images/hajiasal/products/p015.jpg","/images/hajiasal/products/p015-alt.jpg"]',
  '[{"label":"۱۰ گرم","grams":10,"price":580000},{"label":"۲۰ گرم","grams":20,"price":1050000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  72,
  '{"ingredients":"۱۰۰٪ ژل رویال خالص","shippingInfo":"ارسال سردخانه‌ای الزامی"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p016',
  'asal-va-jel-royal',
  'ترکیب عسل و ژل رویال',
  'عسل طبیعی غنی‌شده با ژل رویال تازه',
  'ترکیب اختصاصی عسل چهل‌گیاه با ۳٪ ژل رویال خالص. طعم عسل با فواید ژل رویال، مناسب مصرف روزانه.',
  'royal-jelly',
  '["/images/hajiasal/products/p016.jpg","/images/hajiasal/products/p016-alt.jpg"]',
  '[{"label":"۲۵۰ گرم","grams":250,"price":495000},{"label":"۵۰۰ گرم","grams":500,"price":920000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  48,
  '{"ingredients":"عسل طبیعی، ژل رویال ۳٪","shippingInfo":"نگهداری در یخچال پس از باز کردن"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p017',
  'jel-royal-capsule',
  'کپسول ژل رویال',
  'مصرف آسان، ۶۰ عدد کپسول گیاهی',
  'کپسول‌های ژل رویال خشک‌شده برای مصرف راحت در سفر و محل کار. هر کپسول معادل ۵۰۰ میلی‌گرم ژل رویال خالص.',
  'royal-jelly',
  '["/images/hajiasal/products/p017.jpg","/images/hajiasal/products/p017-alt.jpg"]',
  '[{"label":"۶۰ عدد","grams":60,"price":385000}]',
  NULL,
  1,
  1,
  0,
  4.6,
  29,
  '{"ingredients":"ژل رویال خشک، کپسول گیاهی","shippingInfo":"ارسال عادی"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p018',
  'shehad-ba-moom',
  'شهد با موم طبیعی',
  'موم عسل تازه با عسل خام، تجربه‌ای اصیل',
  'تکه‌های موم عسل با عسل طبیعی داخل آن. موم را می‌جوید و عسل را می‌چشید، همان تجربه‌ای که نسل‌های قبل داشتند.',
  'honeycomb',
  '["/images/hajiasal/products/p018.jpg","/images/hajiasal/products/p018-alt.jpg"]',
  '[{"label":"۳۰۰ گرم","grams":300,"price":420000},{"label":"۶۰۰ گرم","grams":600,"price":780000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  89,
  '{"ingredients":"موم عسل طبیعی، عسل خام","shippingInfo":"بسته‌بندی وکیوم"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p019',
  'moom-asal-tabiei',
  'موم عسل طبیعی',
  'موم زرد خالص برای مصارف سنتی و صنایع دستی',
  'موم عسل خالص برداشت‌شده از کندو. مناسب برای شمع‌سازی، لوازم آرایشی طبیعی و مصارف طب سنتی.',
  'honeycomb',
  '["/images/hajiasal/products/p019.jpg","/images/hajiasal/products/p019-alt.jpg"]',
  '[{"label":"۲۰۰ گرم","grams":200,"price":185000},{"label":"۵۰۰ گرم","grams":500,"price":395000}]',
  NULL,
  1,
  0,
  0,
  4.5,
  23,
  '{"ingredients":"۱۰۰٪ موم عسل طبیعی","shippingInfo":"ارسال استاندارد"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p020',
  'shehad-moom-koochek',
  'موم عسل کوچک (هدیه)',
  'تکه‌های موم عسل در بسته‌بندی هدیه',
  'موم عسل در اندازه‌های کوچک و زیبا برای هدیه دادن. هر بسته شامل ۴ تکه موم با عسل طبیعی.',
  'honeycomb',
  '["/images/hajiasal/products/p020.jpg","/images/hajiasal/products/p020-alt.jpg"]',
  '[{"label":"۱۵۰ گرم","grams":150,"price":245000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  31,
  '{"ingredients":"موم عسل، عسل طبیعی","shippingInfo":"جعبه هدیه شامل"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p021',
  'shehad-moom-premium',
  'شهد موم ممتاز',
  'موم عسل درجه یک با عسل آویشن',
  'ترکیب لوکس موم عسل تازه با عسل آویشن خالص. بسته‌بندی شیشه‌ای با درب چوبی.',
  'honeycomb',
  '["/images/hajiasal/products/p021.jpg","/images/hajiasal/products/p021-alt.jpg"]',
  '[{"label":"۴۰۰ گرم","grams":400,"price":650000}]',
  NULL,
  1,
  0,
  0,
  5,
  18,
  '{"ingredients":"موم عسل، عسل آویشن","shippingInfo":"ارسال ویژه"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p022',
  'asal-sedr',
  'عسل سدر یمنی',
  'عسل سدر اصل با طعم و عطر منحصربه‌فرد',
  'عسل سدر از درخت سدر بومی یمن برداشت می‌شود. یکی از گران‌ترین و خوش‌طعم‌ترین عسل‌های جهان با خواص درمانی شناخته‌شده.',
  'specialty',
  '["/images/hajiasal/products/p022.jpg","/images/hajiasal/products/p022-alt.jpg"]',
  '[{"label":"۲۵۰ گرم","grams":250,"price":890000},{"label":"۵۰۰ گرم","grams":500,"price":1650000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  64,
  '{"ingredients":"۱۰۰٪ عسل سدر","shippingInfo":"گواهی اصالت ضمیمه"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p023',
  'asal-gavan',
  'عسل گون',
  'عسل گون زرد با طعم ملایم و خواص تقویتی',
  'عسل گون از گل‌های گون بومی ایران. رنگ زرد روشن و طعم ملایم. برای زنان باردار و سالمندان بسیار توصیه می‌شود.',
  'specialty',
  '["/images/hajiasal/products/p023.jpg","/images/hajiasal/products/p023-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":365000},{"label":"۱ کیلوگرم","grams":1000,"price":680000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  95,
  '{"ingredients":"۱۰۰٪ عسل گون","shippingInfo":"ارسال استاندارد"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p024',
  'asal-barbat',
  'عسل بربط',
  'عسل بربط جنوبی، طعم تلخ-شیرین خاص',
  'عسل بربط از درخت بربط در مناطق جنوب ایران. طعم تلخ-شیرین متمایز و خواص درمانی فراوان در طب سنتی.',
  'specialty',
  '["/images/hajiasal/products/p024.jpg","/images/hajiasal/products/p024-alt.jpg"]',
  '[{"label":"۴۰۰ گرم","grams":400,"price":520000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  41,
  '{"ingredients":"۱۰۰٪ عسل بربط","shippingInfo":"موجودی محدود"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p025',
  'asal-angabin',
  'عسل انگبین',
  'عسل انگبین طبیعی، شیرین و مقوی',
  'عسل انگبین از ترشحات حشرات روی درختان بربط و توت. طعم شیرین خاص و بافت غلیظ. یکی از عسل‌های سنتی و ارزشمند ایران.',
  'specialty',
  '["/images/hajiasal/products/p025.jpg","/images/hajiasal/products/p025-alt.jpg"]',
  '[{"label":"۳۰۰ گرم","grams":300,"price":445000},{"label":"۶۰۰ گرم","grams":600,"price":820000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  27,
  '{"ingredients":"۱۰۰٪ عسل انگبین","shippingInfo":"ارسال ۳ تا ۵ روز"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p026',
  'asal-kaseh',
  'عسل کاسه‌ای',
  'عسل سنتی کاسه‌ای با بافت خام و طبیعی',
  'عسل کاسه‌ای به روش سنتی بدون فیلتراسیون برداشت می‌شود. ذرات گرده و بره‌موم در عسل باقی می‌ماند و خواص آن حفظ می‌شود.',
  'specialty',
  '["/images/hajiasal/products/p026.jpg","/images/hajiasal/products/p026-alt.jpg"]',
  '[{"label":"۵۰۰ گرم","grams":500,"price":295000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  53,
  '{"ingredients":"عسل کاسه‌ای خام","shippingInfo":"ارسال با ظرف شیشه‌ای"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p027',
  'set-hediye-lux',
  'ست هدیه لوکس',
  'مجموعه ۳ عسل ممتاز در جعبه چوبی دست‌ساز',
  'شامل عسل آویشن، عسل سدر و شهد با موم در شیشه‌های ۱۰۰ گرمی. جعبه چوبی دست‌ساز با حک لوگوی حاجی عسل. هدیه‌ای بی‌نظیر برای مناسبت‌های خاص.',
  'gift-set',
  '["/images/hajiasal/products/p027.jpg","/images/hajiasal/products/p027-alt.jpg"]',
  '[{"label":"ست ۳ عددی","grams":300,"price":1250000}]',
  NULL,
  1,
  0,
  1,
  5,
  44,
  '{"ingredients":"عسل آویشن، عسل سدر، شهد با موم","shippingInfo":"بسته‌بندی هدیه ویژه"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p028',
  'baste-azmayeshi',
  'بسته آزمایشی',
  '۶ طعم مختلف در بسته‌بندی کوچک، شروع خوب',
  'برای کسانی که می‌خواهند طعم‌های مختلف را امتحان کنند. شامل ۶ نمونه ۵۰ گرمی از محبوب‌ترین عسل‌ها.',
  'gift-set',
  '["/images/hajiasal/products/p028.jpg","/images/hajiasal/products/p028-alt.jpg"]',
  '[{"label":"۳۰۰ گرم (۶×۵۰g)","grams":300,"price":385000}]',
  345000,
  1,
  1,
  0,
  4.7,
  112,
  '{"ingredients":"۶ نوع عسل طبیعی","shippingInfo":"ارسال سریع"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p029',
  'set-hediye-nowruz',
  'ست هدیه نوروزی',
  'بسته ویژه نوروز با عسل و موم و ژل رویال',
  'ست نوروزی شامل عسل چهل‌گیاه ۵۰۰ گرم، شهد با موم ۲۰۰ گرم و ژل رویال ۱۰ گرم. جعبه قرمز سنتی با تزئینات نوروزی.',
  'gift-set',
  '["/images/hajiasal/products/p029.jpg","/images/hajiasal/products/p029-alt.jpg"]',
  '[{"label":"ست کامل","grams":710,"price":980000}]',
  NULL,
  1,
  0,
  0,
  4.9,
  36,
  '{"ingredients":"عسل، موم، ژل رویال","shippingInfo":"ارسال قبل از نوروز تضمین شده"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p030',
  'set-hediye-salamati',
  'ست هدیه سلامتی',
  'مجموعه محصولات زنبور برای تقویت ایمنی',
  'شامل عسل آویشن ۳۰۰ گرم، ژل رویال ۱۵ گرم، گرده گل ۱۰۰ گرم و پراپولیس ۳۰ میلی‌لیتر. بسته‌بندی جعبه سلامتی با راهنمای مصرف.',
  'gift-set',
  '["/images/hajiasal/products/p030.jpg","/images/hajiasal/products/p030-alt.jpg"]',
  '[{"label":"ست سلامتی","grams":445,"price":1450000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  22,
  '{"ingredients":"عسل، ژل رویال، گرده گل، پراپولیس","shippingInfo":"ارسال با بیمه"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p031',
  'arag-nana',
  'عرق نعنا',
  'عرق نعنای تازه با عطر تند و طعم خنک، مناسب گوارش و دمنوش',
  'عرق نعنا از برگ‌های تازه نعنا تقطیر می‌شود و عطری تند و طعمی خنک دارد. برای بهبود گوارش، رفع نفخ و افزودن به شربت و دمنوش مناسب است. بدون افزودنی و نگه‌دارنده صنعتی.',
  'distillates',
  '["/images/hajiasal/products/p031.jpg","/images/hajiasal/products/p031-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":95000},{"label":"۱٫۵ لیتر","grams":1500,"price":135000}]',
  NULL,
  1,
  1,
  0,
  4.8,
  64,
  '{"ingredients":"عرق خالص نعنا، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p032',
  'arag-bidmeshk',
  'عرق بیدمشک',
  'عرق بیدمشک معطر، خنک‌کننده و مناسب شربت‌های سنتی',
  'عرق بیدمشک از شکوفه بیدمشک به روش سنتی تقطیر می‌شود. عطری ملایم و گلی دارد و در طب سنتی برای آرامش و خنکی بدن شناخته شده است. ایده‌آل برای شربت بیدمشک و سفره افطار.',
  'distillates',
  '["/images/hajiasal/products/p032.jpg","/images/hajiasal/products/p032-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":110000},{"label":"۱٫۵ لیتر","grams":1500,"price":155000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  51,
  '{"ingredients":"عرق خالص بیدمشک، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p033',
  'arag-kasni',
  'عرق کاسنی',
  'عرق کاسنی تلخ‌ملایم، مناسب پاکسازی و مصرف روزانه',
  'عرق کاسنی از ریشه و برگ کاسنی تقطیر می‌شود و طعمی تلخ‌ملایم دارد. در مصرف سنتی برای کمک به پاکسازی بدن و تعادل کبد شناخته می‌شود. بدون رنگ و اسانس مصنوعی.',
  'distillates',
  '["/images/hajiasal/products/p033.jpg","/images/hajiasal/products/p033-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":90000},{"label":"۱٫۵ لیتر","grams":1500,"price":128000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  43,
  '{"ingredients":"عرق خالص کاسنی، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p034',
  'arag-shatareh',
  'عرق شاتره',
  'عرق شاتره سنتی، سبک و مناسب ترکیب با عرق کاسنی',
  'عرق شاتره از گیاه شاتره به روش تقطیر سنتی تهیه می‌شود. طعمی گیاهی و سبک دارد و معمولاً همراه عرق کاسنی مصرف می‌شود. محصول بدون شیرین‌کننده و نگه‌دارنده.',
  'distillates',
  '["/images/hajiasal/products/p034.jpg","/images/hajiasal/products/p034-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":92000},{"label":"۱٫۵ لیتر","grams":1500,"price":130000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  38,
  '{"ingredients":"عرق خالص شاتره، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p035',
  'arag-baharnarenj',
  'عرق بهارنارنج',
  'عرق بهارنارنج معطر، آرامش‌بخش و مناسب شربت و شیرینی',
  'عرق بهارنارنج از شکوفه درخت نارنج تقطیر می‌شود و عطری مرکباتی و دلنشین دارد. برای شربت، شیرینی‌های سنتی و ایجاد حس آرامش در دمنوش‌ها انتخاب محبوبی است.',
  'distillates',
  '["/images/hajiasal/products/p035.jpg","/images/hajiasal/products/p035-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":125000},{"label":"۱٫۵ لیتر","grams":1500,"price":175000}]',
  NULL,
  1,
  1,
  1,
  4.9,
  72,
  '{"ingredients":"عرق خالص بهارنارنج، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p036',
  'golab-mohammadi',
  'گلاب دوآتشه کاشان',
  'گلاب دوآتشه از گل محمدی کاشان، غلیظ و معطر',
  'گلاب دوآتشه از گل محمدی مرغوب کاشان با تقطیر مجدد به‌دست می‌آید. غلظت و عطر بالاتری نسبت به گلاب معمولی دارد و برای شیرینی، فالوده، شربت و مصارف آرایشی سنتی مناسب است.',
  'distillates',
  '["/images/hajiasal/products/p036.jpg","/images/hajiasal/products/p036-alt.jpg"]',
  '[{"label":"۵۰۰ میلی‌لیتر","grams":500,"price":145000},{"label":"۱ لیتر","grams":1000,"price":265000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  118,
  '{"ingredients":"گلاب دوآتشه گل محمدی","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p037',
  'arag-hel',
  'عرق هل',
  'عرق هل معطر با رایحه‌ای گرم، مناسب دمنوش و شیرینی',
  'عرق هل از دانه‌های هل سبز تقطیر می‌شود و رایحه‌ای گرم و ادویه‌ای دارد. برای عطر بخشیدن به دمنوش، شله‌زرد، شیرینی و برخی غذاهای سنتی کاربرد دارد.',
  'distillates',
  '["/images/hajiasal/products/p037.jpg","/images/hajiasal/products/p037-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":135000},{"label":"۱٫۵ لیتر","grams":1500,"price":190000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  29,
  '{"ingredients":"عرق خالص هل، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p038',
  'arag-avishan',
  'عرق آویشن',
  'عرق آویشن کوهی با عطر تند، مناسب فصل سرما',
  'عرق آویشن از گیاه آویشن کوهی تقطیر می‌شود و عطری تند و گیاهی دارد. در مصرف سنتی برای فصل سرما و تقویت عمومی بدن محبوب است. بدون اسانس مصنوعی.',
  'distillates',
  '["/images/hajiasal/products/p038.jpg","/images/hajiasal/products/p038-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":105000},{"label":"۱٫۵ لیتر","grams":1500,"price":148000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  55,
  '{"ingredients":"عرق خالص آویشن، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p039',
  'arag-shevid',
  'عرق شوید',
  'عرق شوید ملایم، مناسب گوارش و غذاهای سبک',
  'عرق شوید از گیاه شوید تازه تقطیر می‌شود و طعمی ملایم و گیاهی دارد. برای کمک به گوارش و افزودن به برخی غذاها و نوشیدنی‌های سنتی استفاده می‌شود.',
  'distillates',
  '["/images/hajiasal/products/p039.jpg","/images/hajiasal/products/p039-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":88000},{"label":"۱٫۵ لیتر","grams":1500,"price":125000}]',
  NULL,
  1,
  0,
  0,
  4.5,
  21,
  '{"ingredients":"عرق خالص شوید، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p040',
  'arag-pooneh',
  'عرق پونه',
  'عرق پونه کوهی با عطر تند و طعمی تازه',
  'عرق پونه از پونه کوهی تقطیر می‌شود و عطری تندتر از نعنا دارد. برای شربت، دمنوش و مصارف سنتی فصل گرم و سرد مناسب است. محصول خالص و بدون افزودنی.',
  'distillates',
  '["/images/hajiasal/products/p040.jpg","/images/hajiasal/products/p040-alt.jpg"]',
  '[{"label":"۱ لیتر","grams":1000,"price":98000},{"label":"۱٫۵ لیتر","grams":1500,"price":140000}]',
  NULL,
  1,
  1,
  0,
  4.7,
  33,
  '{"ingredients":"عرق خالص پونه، آب","shippingInfo":"ارسال در بطری مقاوم ظرف ۲ تا ۴ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p041',
  'berenj-tarom-hashemi',
  'برنج طارم هاشمی',
  'برنج طارم هاشمی شمال، دانه‌بلند و عطری',
  'برنج طارم هاشمی از شالیزارهای شمال ایران است. دانه‌بلند، عطری و مناسب پخت کته و آبکش. پس از پخت دانه‌ها جدا و نرم می‌مانند و برای مهمانی و مصرف روزانه انتخاب مطمئنی است.',
  'rice',
  '["/images/hajiasal/products/p041.jpg","/images/hajiasal/products/p041-alt.jpg"]',
  '[{"label":"۵ کیلوگرم","grams":5000,"price":685000},{"label":"۱۰ کیلوگرم","grams":10000,"price":1320000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  87,
  '{"ingredients":"برنج طارم هاشمی ۱۰۰٪","shippingInfo":"ارسال در کیسه مقاوم ظرف ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p042',
  'berenj-domsiah',
  'برنج دمسیاه',
  'برنج دمسیاه معطر گیلان، مناسب پلوهای مجلسی',
  'برنج دمسیاه از ارقام معطر شمال است و پس از پخت عطر قوی و دانه‌های کشیده دارد. برای زرشک‌پلو، باقالی‌پلو و مهمانی‌ها بسیار مناسب است.',
  'rice',
  '["/images/hajiasal/products/p042.jpg","/images/hajiasal/products/p042-alt.jpg"]',
  '[{"label":"۵ کیلوگرم","grams":5000,"price":745000},{"label":"۱۰ کیلوگرم","grams":10000,"price":1450000}]',
  NULL,
  1,
  0,
  0,
  4.8,
  61,
  '{"ingredients":"برنج دمسیاه ۱۰۰٪","shippingInfo":"ارسال در کیسه مقاوم ظرف ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p043',
  'berenj-sadri',
  'برنج صدری',
  'برنج صدری دانه‌ریز و نرم، مناسب کته روزانه',
  'برنج صدری بافت نرم‌تری نسبت به ارقام دانه‌بلند دارد و برای کته و مصرف روزمره خانواده مناسب است. پخت آسان و طعم ملایم از ویژگی‌های آن است.',
  'rice',
  '["/images/hajiasal/products/p043.jpg","/images/hajiasal/products/p043-alt.jpg"]',
  '[{"label":"۵ کیلوگرم","grams":5000,"price":595000},{"label":"۱۰ کیلوگرم","grams":10000,"price":1150000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  44,
  '{"ingredients":"برنج صدری ۱۰۰٪","shippingInfo":"ارسال در کیسه مقاوم ظرف ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p044',
  'berenj-fajr',
  'برنج فجر',
  'برنج فجر پرمحصول شمال، اقتصادی و خوش‌پخت',
  'برنج فجر از ارقام اصلاح‌شده شمال است؛ دانه‌ای متوسط، پخت یکنواخت و قیمت مناسب‌تر نسبت به طارم دارد. گزینه خوب برای مصرف هفتگی خانواده.',
  'rice',
  '["/images/hajiasal/products/p044.jpg","/images/hajiasal/products/p044-alt.jpg"]',
  '[{"label":"۵ کیلوگرم","grams":5000,"price":545000},{"label":"۱۰ کیلوگرم","grams":10000,"price":1050000}]',
  NULL,
  1,
  1,
  0,
  4.5,
  36,
  '{"ingredients":"برنج فجر ۱۰۰٪","shippingInfo":"ارسال در کیسه مقاوم ظرف ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p045',
  'berenj-basmati',
  'برنج باسماتی هندی',
  'برنج باسماتی دانه‌بلند معطر، مناسب پلو و بریانی',
  'برنج باسماتی هندی با دانه‌های بسیار بلند و عطر مشخص شناخته می‌شود. پس از پخت دانه‌ها کشیده و جدا می‌مانند و برای بریانی، زرشک‌پلو و پلوهای مجلسی عالی است.',
  'rice',
  '["/images/hajiasal/products/p045.jpg","/images/hajiasal/products/p045-alt.jpg"]',
  '[{"label":"۵ کیلوگرم","grams":5000,"price":625000},{"label":"۱۰ کیلوگرم","grams":10000,"price":1190000}]',
  NULL,
  1,
  0,
  0,
  4.7,
  52,
  '{"ingredients":"برنج باسماتی ۱۰۰٪","shippingInfo":"ارسال در کیسه مقاوم ظرف ۲ تا ۵ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p046',
  'zaferan-negin-ghaen',
  'زعفران نگین قائنات',
  'زعفران نگین اعلای قائنات، رنگ‌دهی و عطر قوی',
  'زعفران نگین قائنات از رشته‌های ضخیم و قرمز یکدست تشکیل شده و قدرت رنگ‌دهی و عطر بالایی دارد. مناسب پلو، دسر، نوشیدنی و هدیه سازمانی. بسته‌بندی بهداشتی و دور از نور.',
  'saffron',
  '["/images/hajiasal/products/p046.jpg","/images/hajiasal/products/p046-alt.jpg"]',
  '[{"label":"۱ گرم","grams":1,"price":185000},{"label":"۴٫۶۰۸ گرم","grams":5,"price":820000}]',
  NULL,
  1,
  0,
  1,
  4.9,
  143,
  '{"ingredients":"زعفران خالص نگین قائنات","shippingInfo":"ارسال در بسته‌بندی ضدنور ظرف ۱ تا ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p047',
  'zaferan-sargol',
  'زعفران سرگل',
  'زعفران سرگل خالص، بدون خامه سفید، رنگ‌دهی عالی',
  'زعفران سرگل فقط بخش قرمز کلاله را شامل می‌شود و بدون خامه سفید است. رنگ‌دهی قوی و عطر مطلوب دارد و برای آشپزی روزمره و حرفه‌ای انتخاب اقتصادی‌تری نسبت به نگین است.',
  'saffron',
  '["/images/hajiasal/products/p047.jpg","/images/hajiasal/products/p047-alt.jpg"]',
  '[{"label":"۱ گرم","grams":1,"price":165000},{"label":"۴٫۶۰۸ گرم","grams":5,"price":735000}]',
  NULL,
  1,
  0,
  1,
  4.8,
  97,
  '{"ingredients":"زعفران خالص سرگل","shippingInfo":"ارسال در بسته‌بندی ضدنور ظرف ۱ تا ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p048',
  'zaferan-pushal',
  'زعفران پوشال',
  'زعفران پوشال با مقداری خامه، مناسب مصرف خانگی',
  'زعفران پوشال شامل رشته قرمز همراه بخشی از خامه زرد است. عطر و رنگ خوبی دارد و برای مصرف خانگی با قیمت مناسب‌تر عرضه می‌شود.',
  'saffron',
  '["/images/hajiasal/products/p048.jpg","/images/hajiasal/products/p048-alt.jpg"]',
  '[{"label":"۱ گرم","grams":1,"price":135000},{"label":"۴٫۶۰۸ گرم","grams":5,"price":595000}]',
  NULL,
  1,
  0,
  0,
  4.6,
  58,
  '{"ingredients":"زعفران پوشال خالص","shippingInfo":"ارسال در بسته‌بندی ضدنور ظرف ۱ تا ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p049',
  'zaferan-dasteh',
  'زعفران دسته',
  'زعفران دسته کامل، مناسب هدیه و نگهداری طولانی',
  'زعفران دسته به صورت رشته‌های کامل کلاله عرضه می‌شود و ظاهر شکیل‌تری برای هدیه دارد. پس از آسیاب یا دم کردن، رنگ و عطر مطلوبی آزاد می‌کند.',
  'saffron',
  '["/images/hajiasal/products/p049.jpg","/images/hajiasal/products/p049-alt.jpg"]',
  '[{"label":"۱ گرم","grams":1,"price":155000},{"label":"۴٫۶۰۸ گرم","grams":5,"price":690000}]',
  NULL,
  1,
  1,
  0,
  4.7,
  41,
  '{"ingredients":"زعفران دسته خالص","shippingInfo":"ارسال در بسته‌بندی ضدنور ظرف ۱ تا ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);

INSERT INTO products (
  id, slug, title, short_description, description, category_id,
  images, weight_options, discount_price, in_stock, featured, bestseller,
  rating, review_count, honey_meta, approval_status
) VALUES (
  'p050',
  'zaferan-powder',
  'پودر زعفران خالص',
  'پودر زعفران آسیاب‌شده تازه، آماده مصرف فوری',
  'پودر زعفران از آسیاب زعفران سرگل تازه تهیه می‌شود و برای استفاده سریع در غذا و نوشیدنی مناسب است. در قوطی درب‌دار و دور از رطوبت بسته‌بندی شده تا عطر آن حفظ شود.',
  'saffron',
  '["/images/hajiasal/products/p050.jpg","/images/hajiasal/products/p050-alt.jpg"]',
  '[{"label":"۱ گرم","grams":1,"price":145000},{"label":"۳ گرم","grams":3,"price":410000}]',
  NULL,
  1,
  0,
  0,
  4.5,
  27,
  '{"ingredients":"پودر زعفران خالص ۱۰۰٪","shippingInfo":"ارسال در قوطی درب‌دار ظرف ۱ تا ۳ روز کاری"}',
  'approved'
)
ON DUPLICATE KEY UPDATE
  slug=VALUES(slug), title=VALUES(title), short_description=VALUES(short_description),
  description=VALUES(description), category_id=VALUES(category_id),
  images=VALUES(images), weight_options=VALUES(weight_options),
  discount_price=VALUES(discount_price), in_stock=VALUES(in_stock),
  featured=VALUES(featured), bestseller=VALUES(bestseller),
  rating=VALUES(rating), review_count=VALUES(review_count),
  honey_meta=VALUES(honey_meta);


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


INSERT INTO site_settings (`key`, value)
VALUES ('hajiasal', '{"brand":{"name":"حاجی عسل","tagline":"طعم اصیل طبیعت، از کندو تا سفره شما","description":"حاجی عسل از سال ۱۴۰۰ با عرضه عسل طبیعی فعالیت خود را آغاز کرد و امروز در کنار عسل، انواع خشکبار، گیاهان دارویی و محصولات طبیعی را با تضمین کیفیت و اصالت ارائه می‌دهد."},"whatsappNumber":"989123456789","social":{"instagram":"https://instagram.com/hajiasal","whatsapp":"https://wa.me/989123456789"},"nav":[{"id":"home","label":"خانه","href":"/"},{"id":"shop","label":"فروشگاه","href":"/shop"},{"id":"about","label":"درباره ما","href":"/about"}],"hero":{"title":"عسل طبیعی، اصیل و درجه یک","subtitle":"از دل کوهستان تا خانه شما، با ضمانت اصالت و ارسال سریع","cta":"مشاهده محصولات","ctaHref":"/shop","image":"/images/hajiasal/hero-studio.png"},"couponHAJI10":{"minOrder":300000,"percent":10},"shippingCost":45000,"milestones":[{"year":"۱۳۶۵","title":"آغاز مسیر","description":"اولین کندوها در دامنه البرز"},{"year":"۱۳۸۵","title":"گسترش شبکه","description":"همکاری با زنبورداران زاگرس و شمال"},{"year":"۱۴۰۰","title":"فروش آنلاین","description":"ارسال سراسری با بسته‌بندی ایمن"}],"trustItems":[{"id":"authentic","title":"ضمانت اصالت","description":"آزمایشگاهی و قابل ردیابی"},{"id":"shipping","title":"ارسال سریع","description":"بسته‌بندی ایمن در سراسر کشور"},{"id":"support","title":"پشتیبانی ۷ روزه","description":"مشاوره خرید و پیگیری سفارش"}],"brandStory":{"title":"چرا حاجی عسل؟","paragraphs":["حاجی عسل فعالیت خود را از سال ۱۴۰۰ با فروش حضوری عسل طبیعی آغاز کرد. همان‌طور که از نام این برند پیداست، نقطه شروع ما عسل بوده و همچنان نیز اصالت و کیفیت عسل، مهم‌ترین ارزش ماست.","در طول این سال‌ها با انتخاب بهترین محصولات طبیعی و جلب اعتماد مشتریان، مسیر رشد خود را ادامه دادیم. از اوایل سال ۱۴۰۵ نیز با حمایت، اعتماد و همراهی شما عزیزان، فعالیت آنلاین حاجی عسل آغاز شد تا بتوانیم محصولات خود را در سراسر کشور در دسترس علاقه‌مندان به محصولات طبیعی قرار دهیم.","امروز حاجی عسل تنها به فروش عسل محدود نیست. در کنار انواع عسل طبیعی، مجموعه‌ای از خشکبار، گیاهان دارویی، دمنوش‌های گیاهی، ادویه‌های طبیعی، فرآورده‌های ارگانیک و دیگر محصولات سالم و باکیفیت را نیز ارائه می‌دهیم؛ محصولاتی که با دقت انتخاب شده‌اند تا تجربه‌ای مطمئن و لذت‌بخش از خرید محصولات طبیعی برای شما رقم بزنند.","ما باور داریم که کیفیت، صداقت و رضایت مشتری مهم‌ترین سرمایه هر کسب‌وکار است. به همین دلیل تلاش می‌کنیم با ارائه محصولات اصیل، قیمت منصفانه و پشتیبانی مناسب، اعتماد شما را حفظ کنیم و همراه همیشگی سفر سلامتی خانواده‌ها باشیم.","حاجی عسل؛ از عسل طبیعی آغاز کرد و امروز همراه شما در مسیر زندگی سالم است."]},"aboutPage":{"paragraphs":["حاجی عسل از سال ۱۳۶۵ با عشق به طبیعت و احترام به زنبور عسل، سفر خود را آغاز کرد. امروز با شبکه‌ای از زنبورداران بومی در مناطق کوهستانی، محصولاتی ارائه می‌دهیم که هر قطره‌اش داستان دارد.","ما معتقدیم عسل واقعی نیاز به میان‌بر ندارد. از برداشت تا بسته‌بندی، هر مرحله با استانداردهای سخت‌گیرانه کنترل می‌شود تا شما با خیال راحت از اصالت و کیفیت لذت ببرید.","انتخاب حاجی عسل یعنی انتخاب سلامتی، طعم اصیل و اعتماد؛ همان چیزی که نسل‌ها در خاطر دارند."]},"trustPages":{"authenticity":{"title":"ضمانت اصالت","intro":"هر شیشه حاجی عسل قابل ردیابی است و بدون افزودنی قند یا شربت عرضه می‌شود.","sections":[{"heading":"منبع مشخص","body":"هر محصول به منطقه برداشت و زنبوردار مشخص نسبت داده می‌شود. اطلاعات دسته روی برچسب درج شده است."},{"heading":"بدون افزودنی","body":"عسل‌های ما حرارت بالا نمی‌بینند و با شکر یا شربت مخلوط نمی‌شوند. بافت و عطر طبیعی حفظ می‌شود."},{"heading":"بازگشت در صورت مغایرت","body":"اگر اصالت یا کیفیت با توضیحات محصول مغایرت داشت، طبق شرایط مرجوعی تا ۷ روز پیگیری می‌کنیم."}]},"privacy":{"title":"حریم خصوصی","intro":"اطلاعات شما فقط برای پردازش سفارش و پشتیبانی استفاده می‌شود.","sections":[{"heading":"چه داده‌هایی جمع می‌شود","body":"نام، شماره موبایل، آدرس ارسال و سوابق سفارش برای تکمیل خرید و پیگیری لازم است."},{"heading":"اشتراک‌گذاری","body":"اطلاعات شما به اشخاص ثالث فروخته نمی‌شود. فقط در حد لازم با سرویس پرداخت و ارسال به اشتراک گذاشته می‌شود."},{"heading":"امنیت","body":"دسترسی به پنل و پایگاه داده محدود و رمزنگاری‌شده است. رمز عبور و کد یکبارمصرف را با کسی به اشتراک نگذارید."}]},"terms":{"title":"قوانین و شرایط","intro":"استفاده از فروشگاه حاجی عسل به معنای پذیرش این شرایط است.","sections":[{"heading":"ثبت سفارش","body":"سفارش پس از تأیید موجودی و در صورت پرداخت آنلاین پس از تأیید درگاه قطعی می‌شود."},{"heading":"قیمت و موجودی","body":"قیمت‌ها به تومان است و ممکن است بدون اطلاع قبلی به‌روز شوند. موجودی لحظه‌ای در صفحه محصول نمایش داده می‌شود."},{"heading":"مسئولیت کاربر","body":"وارد کردن اطلاعات تماس و آدرس صحیح بر عهده خریدار است. تأخیر ناشی از اطلاعات نادرست متوجه فروشگاه نیست."}]},"shipping":{"title":"ارسال و تحویل","intro":"سفارش‌ها با بسته‌بندی ضدضربه به سراسر ایران ارسال می‌شوند.","sections":[{"heading":"زمان آماده‌سازی","body":"سفارش‌های روزهای کاری معمولاً ظرف ۱ تا ۲ روز کاری بسته‌بندی و تحویل پست یا پیک می‌شوند."},{"heading":"هزینه ارسال","body":"هزینه ارسال استاندارد به سفارش اضافه می‌شود. زمان تحویل در یزد معمولاً ۱ تا ۲ روز کاری و در سایر شهرها ۳ تا ۷ روز کاری است."},{"heading":"پیگیری","body":"پس از ثبت، کد پیگیری در پیام موفقیت و صفحه پیگیری سفارش در دسترس است."}]}},"footer":{"phone":"09123456789","email":"info@hajiasal.ir","address":"یزد، امامشهر، بلوار کارگر، خیابان سجاد شمالی، کوچه ۱۵"},"categories":[{"id":"mountain","label":"عسل کوهستان","description":"از ارتفاعات البرز و زاگرس","image":"/images/hajiasal/categories/mountain.jpg"},{"id":"thyme","label":"عسل آویشن","description":"عطر و طعم منحصربه‌فرد","image":"/images/hajiasal/categories/thyme.jpg"},{"id":"multifloral","label":"عسل چهل‌گیاه","description":"ترکیب گل‌های وحشی","image":"/images/hajiasal/categories/multifloral.jpg"},{"id":"royal-jelly","label":"ژل رویال","description":"سرشار از انرژی و مواد مغذی","image":"/images/hajiasal/categories/royal-jelly.jpg"},{"id":"honeycomb","label":"شهد با موم","description":"طبیعی و بدون فرآوری","image":"/images/hajiasal/categories/honeycomb.jpg"},{"id":"specialty","label":"عسل‌های خاص","description":"سدر، گون، بربط و بیشتر","image":"/images/hajiasal/categories/specialty.jpg"},{"id":"gift-set","label":"ست هدیه","description":"بسته‌های لوکس و آزمایشی","image":"/images/hajiasal/categories/gift-set.jpg"},{"id":"distillates","label":"عرقیجات","description":"عرق و گلاب سنتی خالص","image":"/images/hajiasal/categories/distillates.jpg"},{"id":"rice","label":"برنج","description":"ارقام شمال و باسماتی","image":"/images/hajiasal/categories/rice.jpg"},{"id":"saffron","label":"زعفران","description":"نگین، سرگل و پوشال","image":"/images/hajiasal/categories/saffron.jpg"}]}')
ON DUPLICATE KEY UPDATE value=VALUES(value), updated_at=CURRENT_TIMESTAMP(3);

