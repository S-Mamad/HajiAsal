# چک‌لیست ۱۸ مرحله‌ای هر ماژول فروشنده

برای هر ماژول قبل از اعلام اتمام، همه موارد را تیک بزنید.
مرجع تفصیلی ماژول‌ها: `SELLER-MODULES-FA.md`.

1. [ ] **هدف ماژول** و محدودیت دسترسی فروشنده نسبت به کل سیستم مشخص است
2. [ ] **Sidebar:** نام، آیکون Phosphor، ترتیب، Badge، زیرمنو، capability
3. [ ] **Header:** عنوان، Breadcrumb، دکمه‌ها، جستجو صفحه، Quick Action
4. [ ] **List Page:** ستون‌ها، Hide Column، Sort، Filter، Saved Filters، Pagination، Search، Selection، Bulk
5. [ ] **Row Actions:** View / Edit / Duplicate / Delete / Archive / Print / Export / History (حسب نیاز)
6. [ ] **Bulk Actions:** Delete، Change Status، Export، Print، Archive (حسب نیاز)
7. [ ] **Create Form:** Inputها، Validation zod، Placeholder، خطا، Tooltip، محدودیت capability
8. [ ] **Edit Form:** فیلدهای قابل ویرایش vs فقط‌خواندنی برای فروشنده
9. [ ] **Print:** فاکتور / لیبل / بارکد / QR (حسب نیاز)
10. [ ] **Export:** Excel / CSV / PDF / JSON فقط برای انتخاب‌شده یا فیلتر confirm‌شده
11. [ ] **API (حداقلی):** فقط endpointهای لازم + zod + `requireSeller` + ownership؛ بدون ساخت انبوه route بی‌مصرف
12. [ ] **Database:** فیلدها، `seller_id`، Index، Constraint؛ migration additive
13. [ ] **Security:** capability + جلوگیری از دسترسی seller A به داده seller B (تست IDOR)
14. [ ] **UI states:** Loading / Skeleton / Empty / Error / Success / Warning
15. [ ] **Responsive:** Desktop / Tablet / Mobile (جدول → کارت یا scroll افقی کنترل‌شده)
16. [ ] **Performance:** Pagination، Lazy تصویر، بدون N+1، کش سبک در صورت نیاز
17. [ ] **Activity Log:** ثبت رویداد با زمان و IP
18. [ ] **Scenarios:** موفق، ویرایش، حذف، کپی، هشدار موجودی، خطای validation/شبکه

## Definition of Done ماژول

- چک‌لیست بالا کامل
- حداقل یک تست دستی مسیر شاد + یک تست IDOR منفی
- `npx tsc --noEmit` و lint بدون خطای جدید مرتبط
- مستند مسیرها در `SELLER-SPEC.md` به‌روز (اگر مسیر جدید اضافه شد)
