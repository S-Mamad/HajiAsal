# پرامپت تکمیل کامل فروشگاه حاجی‌عسل

**نقش:** تو یک تیم ترکیبی هستی: Lead Frontend + Design Engineer + E-commerce PM برای بازار ایران.  
**هدف:** فروشگاه `/hajiasal` را از دموی نیمه‌کاره به یک فروشگاه premium آمادهٔ لانچ تبدیل کن؛ بدون بازنویسی از صفر، روی استک فعلی (Next.js App Router + Tailwind v4 + Motion + Phosphor + Zustand + Supabase).

---

## Design Read (اجباری)

> Reading this as: redesign of a premium Persian honey e-commerce for trust-first Iranian buyers, with dark luxury editorial language (charcoal + gold), image-led product proof, mobile-first commerce UX.

**Dials:** `VARIANCE 7` · `MOTION 5` · `DENSITY 3`  
**تم قطعی:** تاریک لوکس فعلی (`--void` / طلا). `DESIGN.md` روشن را برای استورفرانت نادیده بگیر؛ فقط ادمین می‌تواند روشن بماند.  
**فونت:** Vazirmatn + Lalezar برای display. بدون Inter. آیکون: Phosphor (نه Lucide در UI جدید).  
**قوانین ضد-slop:** بدون بنفش AI، بدون کارت‌کارت در هیرو، بدون pill cluster، بدون em-dash، هیرو ≤۲–۳ خط متن + یک CTA اصلی، `min-h-[100dvh]`، full-bleed hero.

---

## محدودهٔ کار (Scope)

### A. زیرساخت مسیرها (Must — اول)
1. همهٔ لینک‌های داخلی استورفرانت فقط از `hajiasalPath()` استفاده کنند.
2. اصلاح: `site.json` (ctaHref, nav, categories)، `Footer`, `CategoryGrid`, `Hero`, `ShopContent` (`router.push`), checkout success، breadcrumbs، canonicalهای PDP، لینک‌های `#about`.
3. اسکریپت/تست: `npm run check:paths` باید سبز شود؛ در صورت نبود، گسترش بده.

### B. تصاویر حرفه‌ای (Must)
1. حذف کامل Unsplash از `products.json` و `site.json`.
2. استفاده از assetهای محلی:
   - Hero: `/images/hajiasal/hero.webp`
   - Categories: `/images/hajiasal/categories/{id}.webp`
   - Products: `/images/products/{id}.webp` و `{id}-alt.webp`
   - About: `/images/about/workshop.webp`
   - OG: `/images/hajiasal/og/og.webp`
3. اگر کیفیت asset کافی نبود: با imagegen تصاویر محصول/هیرو در سبک عکاسی استودیویی عسل (شیشه کهربایی، نور گرم، پس‌زمینه تیره) بساز و جایگزین کن.
4. `ProductImage` باید fallback محلی داشته باشد، نه Unsplash.
5. همهٔ `<img>`/`next/image` با `alt` فارسی معنادار، `sizes` درست، و اولویت LCP برای هیرو.

### C. UI خفن + ریسپانسیو موبایل کامل (Must)
1. **موبایل‌اول:** هدر چسبان، منوی کشویی روان، سبد drawer تمام‌عرض، sticky add-to-cart در PDP، فیلتر فروشگاه به‌صورت bottom-sheet یا drawer (نه سایدبار فشردهٔ دسکتاپ روی موبایل).
2. Breakpoints: ۳۲۰ / ۳۷۵ / ۳۹۰ / ۷۶۸ / ۱۰۲۴ / ۱۴۴۰ را بدون overflow افقی پاس کن.
3. تایپوگرافی موبایل: هیرو خوانا، بدون متن ریز روی تصویر؛ فاصلهٔ عمودی سخاوتمند.
4. Motion: Reveal اسکرول + hover مغناطیسی دکمه‌ها + انتقال نرم drawer؛ احترام به `prefers-reduced-motion`.
5. سکشن‌های هوم را ارتقا بده (نه بازنویسی کور):
   - Hero full-bleed با تصویر محلی + گرادیان خوانا + CTA واضح
   - TrustBar فشرده و قابل اسکرول افقی در موبایل
   - Bestsellers کاروسل با snap
   - CategoryGrid نامتقارن (نه ۳ کارت مساوی اجباری)
   - BrandStory تصویر + متن (split)
   - Testimonials بدون کارت‌کارت کلیشه‌ای
   - Newsletter مینیمال
6. فوتر: لینک‌های حقوقی، تماس واقعی‌نما، اینماد placeholder آمادهٔ embed، شبکه‌های اجتماعی.
7. Empty / loading / error states برای فروشگاه، سبد، جستجو، checkout.

### D. Checkout و پرداخت (Must برای کامل بودن تجاری)
1. `PaymentMethodSelector` و `ShippingMethodSelector` را به `checkout/page.tsx` وصل کن.
2. روش‌ها: `cod` | `online` (زرین‌پال اگر env باشد) | `card_to_card` (در صورت وجود UI).
3. بعد از ثبت سفارش online → `/api/checkout/create` → redirect.
4. success/fail URLها حتماً زیر `/hajiasal/...`.
5. FAQ و کپی سایت با واقعیت پرداخت هم‌خوان باشد.

### E. اعتماد و حقوقی ایران (Must)
1. `trustPages` کامل در `site.json` برای: authenticity, terms, privacy, shipping.
2. صفحات موجود نباید کرش کنند؛ محتوای فارسی واقعی و کوتاه بنویس.
3. جای اینماد در فوتر (slot با کامنت env برای کد واقعی).
4. صفحهٔ اصالت محصول قابل فهم و اعتمادساز.

### F. SEO و کیفیت فنی (Should)
1. canonical و JSON-LD با پیشوند `/hajiasal`؛ ارز `IRR` یا توضیح تومان یکدست.
2. sitemap شامل محصولات و صفحات اعتماد.
3. Lighthouse هدف: Performance/SEO/A11y ≥ ۹۰ روی موبایل (تا حد ممکن بدون قربانی کردن کیفیت تصویر).

### G. خارج از محدوده (فعلاً نکن)
- مهاجرت فریم‌ورک، تغییر به تم روشن استورفرانت، ساخت اپ موبایل جدا، چندزبانگی، درگاه دوم، برنامه وفاداری.

---

## ترتیب اجرا (اجباری)

1. پرامپت را ذخیره کن (همین فایل).
2. مسیرها را درست کن + تصاویر را به local سوییچ کن.
3. UI موبایل + polish سکشن‌ها.
4. Checkout + trust pages.
5. `npm run build` و در صورت امکان چک بصری موبایل.
6. فقط با شواهد verification اعلام تکمیل کن.

---

## Definition of Done

- [ ] هیچ لینک داخلی بدون `/hajiasal` کاربر را از فروشگاه خارج نکند
- [ ] هیچ URL آن‌اسپلش در دادهٔ استورفرانت نباشد
- [ ] هوم/فروشگاه/PDP/سبد روی عرض ۳۷۵px بدون اسکرول افقی و با UI premium
- [ ] Checkout روش پرداخت را نشان دهد و online در صورت env کار کند
- [ ] صفحات حقوقی و اصالت محتوا داشته باشند
- [ ] Build بدون خطا

**شروع کن. بدون سوال اضافه مگر بلاکر واقعی.**
