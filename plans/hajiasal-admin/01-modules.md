# ماژول‌های Phase 1–4

هر ماژول باید چک‌لیست `docs/ADMIN-MODULE-CHECKLIST-FA.md` را پاس کند.

## Phase 1
- dashboard, products, categories, brands, orders, customers

## Phase 2
- users (admin), articles, reviews, messages, media, pages

## Phase 3
- coupons, banners, qa, tickets, notifications

## Phase 4
- settings, reports, logs + e2e smoke

## Verification per module

```bash
# API smoke (مثال)
curl -s -o /dev /null -w "%{http_code}" http://localhost:3000/api/admin/<resource>
```

STOP if permission bypass exists on any mutating route.
