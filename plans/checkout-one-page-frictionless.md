# پلن: پرداخت یکپارچه تک‌صفحه‌ای (Frictionless One-Page Checkout)

تاریخ: ۱۴۰۴/۰۵/۲۲ — هدف: پیاده‌سازی موبه‌موی مشخصات کاربر بدون جاانداختن حتی یک خط.

## وضعیت فعلی (تشخیص)

- `src/app/checkout/page.tsx` هنوز **۳ مرحله‌ای** است (`steps`) → باید حذف شود.
- `AddressMapSheet` + Leaflet هست، ولی پین **قابل‌کشیدن** است؛ مشخصات می‌خواهد پین **ثابت مرکز** + drag نقشه.
- `ShippingMethodSelector` کارت دارد ولی بدون `layout`/`پیشنهاد ما`/`border-amber` و متن‌های دقیق مشخصات.
- `PaymentMethodSelector` انتخاب اجباری دارد → باید کارت **استاتیک اعتماد** + پیش‌فرض درگاه رسمی.
- Sticky فقط «ادامه» است، نه «تایید و پرداخت» با مبلغ روی دکمه.
- کد تخفیف **باز و بزرگ** است → تلهٔ روانی.
- Micro-Cart Reminder و Error Shake/Haptic نیست.
- Zustand اختصاصی checkout نیست (`isProcessing` در state محلی).

## قانون اجرا

1. هیچ چیزی از مشخصات حذف/تغییر معنایی نشود.
2. رفتار امنیتی فعلی بک‌اند حفظ شود (قیمت از DB، `calcShippingCost`).
3. اسنپ‌پی به‌صورت اختیاری زیر کارت اعتماد بماند (بدون شکستن Zero-Trust).
4. پس از پیاده‌سازی: بازخوانی خط‌به‌خط پیام کاربر و اصلاح شکاف‌ها.
5. تست واحد + به‌روزرسانی e2e برای مسیر تک‌صفحه‌ای.

## فایل‌ها

| فایل | کار |
|------|-----|
| `src/store/checkout.ts` | Zustand: `shippingMethod`, `address`, `isProcessing` |
| `src/components/checkout/MicroCartReminder.tsx` | ردیف افقی آواتار محصولات `h-16` + badge `xN` |
| `src/components/checkout/CouponTrap.tsx` | لینک «کد تخفیف دارید؟» + Accordion |
| `src/components/checkout/AnimatedTotal.tsx` | blur ۲۰۰ms + counter |
| `src/components/checkout/ShippingMethodSelector.tsx` | ۳ کارت + Motion layout + shake API |
| `src/components/checkout/PaymentTrustCard.tsx` | کارت استاتیک قفل سبز |
| `src/components/checkout/CheckoutStickyFooter.tsx` | نوار چسبان + دکمه مبلغ + trust anchors |
| `src/components/checkout/LocationPickerMap.tsx` | پین ثابت مرکز + moveend |
| `src/components/checkout/AddressMapSheet.tsx` | reverse + shimmer + کپسول شناور + پلاک/واحد |
| `src/components/checkout/PaymentHandoffOverlay.tsx` | `bg-white/80` + پیام نشست امن |
| `src/app/checkout/page.tsx` | یک صفحه، بدون step |
| تست‌ها | unit + اصلاح e2e |

## ماژول ۱ — Spatial

- [ ] کارت آدرس پیش‌فرض: `bg-white rounded-2xl p-4 shadow-sm` (با توکن‌های برند: `bg-surface`)
- [ ] دکمه افزودن/تغییر → Bottom Sheet تقریباً تمام‌صفحه
- [ ] نقشه پرصفحه، پین ثابت مرکز، drag نقشه زیر پین
- [ ] `moveend`/`dragend` → shimmer ~۱s روی تایید + reverse Neshan
- [ ] کپسول شناور: «یزد، بلوار کارگر...»
- [ ] بعد تایید: فقط پلاک + واحد (مینیمال) + فیلدهای گیرنده ضروری موجود

## ماژول ۲ — Logistics

- [ ] بدون radio بومی
- [ ] کارت ۱: پست پیشتاز ۳–۵ روز + قیمت اقتصادی
- [ ] کارت ۲: پست ویژه ۱–۲ روز + `border-amber-500` + لیبل `پیشنهاد ما` + آیکون طلایی
- [ ] کارت ۳: انبار مرکزی رایگان + آدرس ریز خاکستری (`site.footer.address`)
- [ ] Framer Motion `layout` + `bg-amber-50` انتخاب‌شده

## ماژول ۳ — Gateway

- [ ] کارت استاتیک «روش پرداخت» + قفل سبز + «پرداخت امن از طریق درگاه رسمی»
- [ ] بدون اکشن اجباری؛ `online` پیش‌فرض

## ماژول ۴ — Sticky Bar

- [ ] `fixed bottom-0`
- [ ] تغییر ارسال → blur ۲۰۰ms + counter روی مبلغ
- [ ] دکمه عریض: «پرداخت {مبلغ} تومان» / «تایید و پرداخت»
- [ ] ۳ micro-trust زیر دکمه: SSL / اصالت / بازگشت

## ماژول ۵ — Handoff

- [ ] `isProcessing=true` → دکمه `opacity-70` + spinner
- [ ] overlay `bg-white/80 backdrop-blur-sm z-50+` کل صفحه
- [ ] سپر/لوگو pulse + «در حال ایجاد نشست امن بانکی...»
- [ ] بعد توکن → redirect

## معماری

- [ ] Front فقط `addressId`/`shippingMethod`(+customer از آدرس انتخابی) بفرستد؛ قیمت از سرور
- [ ] Checkout Zustand با ۳ فیلد
- [ ] CouponTrap مخفی
- [ ] MicroCart بالا
- [ ] Validation: shake + haptic + scrollIntoView

## گیت‌های تایید

1. `npx vitest run` روی تست‌های checkout/store → **PASS (۹ تست)**
2. `npx tsc --noEmit` فیلتر checkout → **PASS**
3. بازخوانی کامل پیام کاربر → چک‌لیست زیر
4. Aikido: نیاز به لاگین کاربر داشت؛ اسکن محلی انجام نشد تا auth شود
5. ۳ دور خودبازبینی UI منطق → انجام شد

## باگ‌های پیدا شده در بازبینی دوم (و فیکس)

| باگ | شدت | فیکس |
|-----|------|------|
| حلقهٔ feedback نقشه: `move` → setState → `setView` وسط drag | بحرانی | فقط `dragend`/`zoomend` به parent؛ جلوگیری از sync روی emit خودمان |
| `isProcessing` در Zustand بعد از برگشت از درگاه گیر می‌کرد | بحرانی | reset روی mount/unmount صفحه |
| Shake با `key={shakeToken}` کل Shipping را remount می‌کرد | بالا | animate بدون remount |
| `AnimatedTotal` با تغییر سریع مبلغ روی عدد کهنه می‌ماند | بالا | cleanup به target نهایی sync می‌شود |
| `addressId` فقط فرانت بود؛ بک‌اند آدرس را از DB نمی‌خواند | بالا | `orders` با `getAddressesByUserId` مالکیت را چک می‌کند |
| Sticky روی `sm+` static شده بود (خلاف fixed bottom) | متوسط | همیشه `fixed bottom-0` + spacer |
| تأیید نقشه با province کهنه بدون reverse تازه | متوسط | confirm همیشه reverse می‌زند |
| override شدن phone سشن با receiverPhone | متوسط | phone فقط از سشن |

تست بعد از فیکس: ۹/۹ پاس · tsc تمیز


---

## چک‌لیست تأیید موبه‌مو (پس از پیاده‌سازی)

### معماری صفحه
- [x] Multi-step حذف شد (هیچ `step`/`بعدی` نیست)
- [x] One-Page Mobile-First

### ۱ Spatial
- [x] کارت آدرس `rounded-2xl p-4 shadow-sm`
- [x] Bottom Sheet نقشه
- [x] پین ثابت مرکز + drag نقشه
- [x] Reverse + shimmer ~۱s + کپسول شناور
- [x] پلاک/واحد بعد از تأیید

### ۲ Logistics
- [x] بدون radio بومی
- [x] ۳ کارت selectable + Motion layout
- [x] پیشنهاد ما + amber روی VIP
- [x] انبار مرکزی رایگان + آدرس ریز

### ۳ Gateway
- [x] کارت استاتیک قفل سبز + کپی اعتماد
- [x] پیش‌فرض online بدون کلیک اجباری

### ۴ Sticky
- [x] fixed bottom
- [x] blur ۲۰۰ms + counter
- [x] دکمه تأیید و پرداخت + مبلغ
- [x] ۳ micro-trust زیر دکمه

### ۵ Handoff
- [x] isProcessing → spinner + opacity
- [x] overlay bg-white/80 backdrop-blur
- [x] «در حال ایجاد نشست امن بانکی...»
- [x] redirect بعد از توکن

### معماری پنهان
- [x] Zero Trust: addressId + shippingMethod؛ قیمت از سرور
- [x] Zustand: shippingMethod / address / isProcessing
- [x] CouponTrap مخفی
- [x] MicroCart افقی + badge
- [x] Shake + haptic + scrollIntoView
