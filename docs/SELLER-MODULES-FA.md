# ماژول‌های پنل فروشنده (۱۷ ماژول × ۱۸ مرحله)

هر ماژول باید قبل از Done چک‌لیست `SELLER-MODULE-CHECKLIST-FA.md` را پاس کند.
API فقط وقتی UI واقعاً به آن نیاز دارد اضافه می‌شود؛ قراردادها در حد مشخصات هستند نه الزام به ساخت فوری همه endpointها.

---

## 1) داشبورد (Dashboard)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | نمای روزانه عملکرد فروشنده؛ فقط آمار و رویدادهای خودش |
| 2 Sidebar | «داشبورد» · `SquaresFour` · ترتیب ۱ · بدون زیرمنو |
| 3 Header | عنوان داشبورد · بدون Breadcrumb عمیق · Quick: «سفارش‌های جدید» |
| 4 List | ندارد؛ ویجت‌ها: KPI مالی، متریک‌ها، آخرین سفارش/تیکت/اعلان، نمودار فروش و درآمد |
| 5–6 Row/Bulk | ندارد |
| 7–8 Form | ندارد |
| 9–10 Print/Export | خروجی خلاصه داشبورد PDF اختیاری در فاز بعد |
| 11 API | `GET /api/seller/dashboard` (موجود — گسترش فیلدها) |
| 12 DB | از orders/products/wallet ledger؛ بدون جدول جدا اجباری |
| 13 Security | فقط seller session |
| 14 UI | Skeleton KPI · Empty «هنوز فروشی ندارید» · Error retry |
| 15 Responsive | KPI دو ستونه موبایل · نمودار full-width |
| 16 Perf | یک payload aggregatه‌شده؛ کش کوتاه ۳۰–۶۰s سمت سرور اختیاری |
| 17 Log | بازدید داشبورد لاگ نمی‌شود؛ فقط اکشن‌ها |
| 18 Scenarios | فروشنده جدید خالی · فروشنده فعال با داده · session منقضی |

**KPIها:** فروش امروز / هفته / ماه · درآمد کل · موجودی کیف پول · تعداد سفارش · تعداد محصول · کم‌موجود.

---

## 2) محصولات (Products)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | مدیریت کاتالوگ متعلق به فروشنده؛ انتشار نهایی ممکن است نیاز به تأیید ادمین داشته باشد (`approval_status`) |
| 2 Sidebar | «محصولات» · `ShoppingBag` · Badge پیش‌نویس/در انتظار تأیید |
| 3 Header | محصولات · Breadcrumb فروشنده › محصولات · CTA «افزودن محصول» · جستجو |
| 4 List | ستون: تصویرک، عنوان، قیمت، موجودی، وضعیت انتشار، approval، به‌روزرسانی · Hide/Sort/Filter/Saved/Pagination/Selection |
| 5 Row | View, Edit, Duplicate, Delete, Archive, Disable, History |
| 6 Bulk | Delete, Change status, Archive, Export selected |
| 7 Create | عنوان، توضیحات کوتاه/کامل، تصاویر چندتایی، قیمت، وزن/واریانت، موجودی، ویژگی‌ها، دسته، برند (اگر capability)، SEO (اگر capability)، وضعیت draft/submit |
| 8 Edit | قفل: `commission` پلتفرم، slug پس از انتشار عمومی (یا فقط با ادمین)، فیلدهای سیستمی featured/bestseller اگر فقط ادمین |
| 9 Print | برچسب/بارکد/QR از مرکز چاپ |
| 10 Export | Excel/CSV انتخاب‌شده |
| 11 API | list/create/update/delete/duplicate — گسترش روی `/api/seller/products` |
| 12 DB | `products.seller_id` موجود؛ فیلدهای archive/status در صورت نیاز additive |
| 13 Security | همه عملیات با ownership؛ duplicate فقط از محصول خود |
| 14 UI | Empty «اولین محصول را بسازید» · Confirm حذف |
| 15 Responsive | جدول → کارت فشرده در موبایل |
| 16 Perf | Pagination · lazy images |
| 17 Log | create/update/delete/duplicate/archive |
| 18 Scenarios | draft ذخیره · submit برای تأیید · duplicate · bulk archive · خطای validation قیمت |

---

## 3) سفارشات (Orders)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | پردازش سفارش‌هایی که حداقل یک آیتم از این فروشنده دارند؛ مبالغ = سهم فروشنده |
| 2 Sidebar | «سفارشات» · `Package` · Badge تعداد جدید/در انتظار |
| 3 Header | سفارشات · فیلتر وضعیت/تاریخ · Tagging |
| 4 List | شماره، تاریخ، مشتری (نام/شهر)، مبلغ سهم، وضعیت سفارش، پرداخت، تگ، رهگیری |
| 5 Row | View, Confirm, Prepare, Tracking, Note, Print invoice/label, PDF, History |
| 6 Bulk | Change status (محدود), Print list, Export Excel |
| 7–8 Form | صفحه جزئیات: مشتری، اقلام فروشنده، مبلغ، پرداخت، وضعیت؛ فرم رهگیری و یادداشت |
| 9 Print | فاکتور سهم فروشنده، لیبل بسته، لیست سفارشات |
| 10 Export | PDF تک‌سفارش، Excel چندتایی selected |
| 11 API | list/detail/patch status-tracking-note · export موجود قابل گسترش |
| 12 DB | `orders` JSON items + فیلتر seller؛ جداول اختیاری `order_seller_notes`, `order_tags` |
| 13 Security | سفارش بدون آیتم فروشنده → 404 |
| 14 UI | Timeline وضعیت · Warning اگر آدرس ناقص |
| 15 Responsive | جزئیات stack عمودی |
| 16 Perf | index روی created_at؛ pagination |
| 17 Log | تأیید وضعیت، رهگیری، یادداشت، چاپ |
| 18 Scenarios | تأیید · آماده‌سازی · ثبت رهگیری · چاپ فاکتور · تلاش دسترسی به سفارش دیگران |

---

## 4) مشتریان (Customers)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | فقط خریداران از این فروشنده (مشتق از سفارش‌ها)؛ نه CRM کل پلتفرم |
| 2 Sidebar | «مشتریان» · `Users` |
| 3 Header | جستجوی نام/موبایل |
| 4 List | نام، موبایل (ماسک اختیاری)، شهر، تعداد سفارش، مبلغ خرید، آخرین خرید |
| 5 Row | View history (سفارش‌های همین فروشنده) |
| 6 Bulk | Export selected |
| 7–8 | بدون create؛ edit ندارد |
| 9–10 | Export CSV/Excel |
| 11 API | `GET` list/detail scoped |
| 12 DB | View منطقی از orders؛ جدول جدا اختیاری نیست |
| 13 Security | بدون افشای آدرس کامل مگر در سفارش fulfillment |
| 14–18 | Empty «هنوز مشتری‌ای ندارید» · فقط خواندنی |

---

## 5) موجودی (Inventory)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | مشاهده و تعدیل موجودی محصولات خود؛ هشدار اتمام |
| 2 Sidebar | «موجودی» · `Warehouse` · Badge کم‌موجود |
| 3 Header | آستانه هشدار · ورود/کاهش سریع |
| 4 List | محصول، SKU/وزن، موجودی فعلی، آستانه، آخرین تغییر |
| 5 Row | Adjust +, Adjust −, History |
| 6 Bulk | Adjust selected (فرم مشترک) |
| 7–8 | فرم تعدیل: مقدار، دلیل، یادداشت |
| 9–10 | Export موجودی selected |
| 11 API | موجود `/api/seller/inventory` — گسترش history |
| 12 DB | stock روی product/variant + `inventory_movements` با seller_id |
| 13 Security | ownership محصول |
| 14 UI | Warning ردیف قرمز/کهربایی برای کم‌موجود |
| 15–16 | Pagination · بروزرسانی خوش‌بینانه با reconcile |
| 17 Log | هر movement |
| 18 Scenarios | ورود · کاهش به صفر · نوتیف low stock · تلاش روی محصول دیگران |

---

## 6) کیف پول و مالی (Wallet)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | موجودی، درآمد در انتظار، قابل برداشت، درخواست تسویه، تاریخچه |
| 2 Sidebar | «کیف پول» · `Wallet` (جایگزین منوی earnings) |
| 3 Header | CTA «درخواست تسویه» اگر قابل برداشت > 0 و capability |
| 4 List | دفتر کل: تاریخ، نوع، مبلغ، وضعیت، مرجع سفارش/تسویه |
| 5 Row | View detail |
| 6 Bulk | Export selected |
| 7 Create | فرم withdraw: مبلغ، حساب بانکی پروفایل، توضیح |
| 8 Edit | درخواست pending قابل لغو؛ تأیید فقط ادمین |
| 9–10 | Export صورتحساب PDF/Excel |
| 11 API | balance, ledger, withdraw — مهاجرت از earnings |
| 12 DB | `seller_wallet_ledger`, `seller_withdrawals` |
| 13 Security | withdraw فقط برای خود؛ سقف و حداقل از تنظیمات ادمین |
| 14 UI | سه کارت موجودی/در انتظار/قابل برداشت |
| 15–18 | Reject/approve توسط ادمین → نوتیف فروشنده |

**Redirect:** `/seller/earnings` → `/seller/wallet` (۳۰۱ یا rewrite داخلی).

---

## 7) گزارش‌ها (Reports)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | گزارش فروش، سود تقریبی (پس از کمیسیون)، محصولات، سفارشات، مشتریان — فقط دامنه خود |
| 2 Sidebar | «گزارش‌ها» · `ChartBar` |
| 3 Header | بازه تاریخ · نوع گزارش · Export |
| 4 List | جدول خلاصه + نمودار |
| 5–8 | بدون CRUD ردیف |
| 9–10 | PDF, Excel, CSV |
| 11 API | `GET /api/seller/reports?type=&from=&to=` |
| 12 DB | queryهای aggregate؛ بدون جدول اجباری |
| 13–18 | capability `reports.export` برای دانلود |

---

## 8) تیکت‌ها (Tickets)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | ارتباط فروشنده با مدیریت: عنوان، دسته، اولویت، متن، ضمیمه |
| 2 Sidebar | «تیکت‌ها» · `Lifebuoy` · Badge باز/در انتظار |
| 3 Header | CTA «تیکت جدید» |
| 4 List | وضعیت: باز، بسته، در انتظار پاسخ، پاسخ داده شده |
| 5 Row | View thread, Close (اگر مجاز) |
| 6 Bulk | ندارد یا Close محدود |
| 7 Create | فرم کامل + آپلود |
| 8 Edit | فقط افزودن پیام؛ فیلدهای اولیه قفل |
| 9–10 | Export اختیاری |
| 11 API | CRUD نازک tickets |
| 12 DB | `seller_tickets` + `seller_ticket_messages` یا reuse با seller_id |
| 13–18 | فایل ضمیمه فقط در فضای seller |

---

## 9) اعلان‌ها (Notifications)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | پیام مدیر، سیستم، هشدارها؛ مکمل Notification Center |
| 2 Sidebar | «اعلان‌ها» · `Bell` · Badge نخوانده |
| 3–5 | لیست کامل با فیلتر نوع/خوانده · Mark read |
| 6 Bulk | Mark read selected |
| 7–10 | ندارد |
| 11–12 | جدول `seller_notifications` |
| 13–18 | فقط seller_id خود |

---

## 10) نظرات محصولات (Reviews)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | مشاهده نظرات محصولات خود، پاسخ، گزارش به ادمین |
| 2 Sidebar | «نظرات» · `ChatCircle` · Badge بدون پاسخ |
| 4 List | محصول، امتیاز، متن، تاریخ، وضعیت پاسخ |
| 5 Row | Reply, Report to Admin |
| 7–8 | فرم پاسخ؛ ویرایش پاسخ در پنجره محدود |
| 11–12 | reviews موجود + `seller_id` از طریق product |
| 13 | فقط نظرات محصولات owned |
| 17–18 | log پاسخ و گزارش |

---

## 11) پرسش و پاسخ (Q&A)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | سوالات کاربران روی محصولات خود؛ پاسخ و وضعیت انتشار |
| 2 Sidebar | «پرسش و پاسخ» · `Question` |
| 4 List | محصول، سوال، وضعیت، تاریخ |
| 5 Row | Answer, Set visibility (اگر مجاز) |
| 13 | ownership محصول |
| 18 | پاسخ موفق · گزارش محتوای نامناسب به ادمین |

---

## 12) تخفیف‌ها (Discounts) — capability

| مرحله | مشخصات |
|------|--------|
| 1 هدف | کد تخفیف و کمپین فقط اگر `discounts.manage` فعال باشد |
| 2 Sidebar | نمایش فقط با capability · `Percent` |
| 4–8 | نوع درصدی/مبلغی، سقف، تاریخ، محصولات مشمول، سقف استفاده |
| 13 | کوپن سراسری ادمین قابل ویرایش نیست |
| 18 | ساخت · انقضا · تداخل با کوپن پلتفرم (اولویت در checkout مشخص شود) |

---

## 13) پروفایل فروشنده (Seller Profile)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | اطلاعات شخصی، فروشگاه (لوگو، بنر، آدرس، تماس)، مالی بانکی، تنظیمات اعلان |
| 2 Sidebar | «پروفایل» · `UserCircle` |
| 7–8 | قابل ویرایش: نام فروشگاه، لوگو، بنر، آدرس، تماس، شبا/کارت/بانک، prefs نوتیف · قفل: کمیسیون، status، phone ورود (تغییر با تأیید ادمین) |
| 11–12 | گسترش ستون‌های `sellers` |
| 17 | هر تغییر پروفایل/بانکی لاگ شود |
| 18 | آپلود لوگو · اعتبارسنجی شبا · Incomplete profile warning در داشبورد |

---

## 14) فایل‌ها (Media / Files)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | مدیریت تصاویر و PDF آپلودشده توسط فروشنده |
| 2 Sidebar | «فایل‌ها» · `Folder` |
| 4 List | نام، نوع، حجم، تاریخ، استفاده‌شده در |
| 5–6 | Upload, Delete, Bulk delete |
| 12 | `seller_media` یا storage path scoped |
| 13 | حذف فقط فایل خود؛ جلوگیری از path traversal |
| 16 | lazy grid · محدودیت حجم/تعداد |

---

## 15) مرکز چاپ و خروجی (Print & Export Center)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | هاب مستقل چاپ/خروجی جدا از اکشن‌های داخل ماژول‌ها |
| 2 Sidebar | «چاپ و خروجی» · `Printer` |
| 4 UI | انتخاب نوع سند → انتخاب موجودیت‌ها → پیش‌نمایش → چاپ/دانلود |
| 9 Print | فاکتور، لیبل مرسوله، لیست سفارش، بارکد، QR |
| 10 Export | Excel, CSV, PDF, JSON (اختیاری) |
| 13 | فقط IDهای owned |
| 17 | هر job چاپ/خروجی لاگ |

---

## 16) ابزارها (Tools)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | Import/Export محصولات از Excel + دانلود نمونه |
| 2 Sidebar | «ابزارها» · `Wrench` |
| 7 | آپلود فایل · mapping ستون · گزارش خطا ردیفی |
| 10 | Export کاتالوگ · Template download |
| 13 | capability `tools.import_export` |
| 16 | پردازش بچ؛ سقف ردیف (مثلاً ۵۰۰) |
| 18 | import موفق جزئی · rollback یا skip ردیف‌های خطا |

---

## 17) تنظیمات فروشگاه (Shop Settings)

| مرحله | مشخصات |
|------|--------|
| 1 هدف | ساعت کاری، زمان آماده‌سازی، تعطیلات، پیام خودکار، تنظیمات ارسال |
| 2 Sidebar | «تنظیمات» · `Gear` (موجود) |
| 7–8 | فرم بخش‌بندی‌شده؛ قفل: نرخ کمیسیون، سیاست بازگشت سراسری |
| 12 | JSON `shop_settings` روی sellers یا جدول جدا |
| 17–18 | ذخیره موفق · اعتبارسنجی بازه ساعت |

---

## ماتریس اولویت پیاده‌سازی

| اولویت | ماژول‌ها |
|--------|---------|
| P0 | Foundation سراسری + Dashboard + Products + Orders + Inventory + Wallet |
| P1 | Customers + Profile + Settings + Notifications + Tickets + Reviews + Reports + Media |
| P2 | Q&A + Print/Export Center + Tools + Discounts |

هر ماژول = یک vertical slice قابل دمو، نه لایه افقی «همه APIها اول».
