# CONTEXT — Hajiasal Seller Panel

## Stack.
- Next.js 16 App Router, React 19, Tailwind v4, mysql2, zod, Phosphor, motion
- Auth: جدول `sellers` + کوکی `hajiasal_seller_session` (۷ روز)
- Isolation: هر query/mutation فقط روی `seller_id` همان session
- Gate: `src/lib/server/seller-gate.ts` (`gateSeller` + capabilities)
- DB: فقط MySQL/MariaDB — migration `mysql-migrations/007_seller_panel.sql`

## Implemented
- Shell: Global Search, Notification Center, Shortcuts, Activity, SellerDataTable, grouped nav
- Modules: dashboard, products (+new/edit/view), orders (+detail), inventory qty, wallet (earnings→redirect), customers, profile, settings, notifications, media, tickets, reviews, reports, qa, print-export, tools, discounts (capability)
- Admin: `GET/PATCH /api/admin/sellers/[id]/withdrawals`
- E2E smoke: `e2e/hajiasal-seller-panel.spec.ts`

## Key paths
- UI: `src/app/seller/(panel)/`, `src/components/seller/`
- Lib: `src/lib/seller/`, `src/lib/server/seller-*.ts`
- API: `src/app/api/seller/`
- Docs: `docs/SELLER-*.md`

## Rule
Never switch DB engine away from MySQL. Admin panel (`/admin`) is separate.
