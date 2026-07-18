# CONTEXT — Hajiasal Admin Panel

## Stack
- Next.js 16 App Router, React 19, Tailwind v4, mysql2
- Auth: `admin_users` + roles (`super_admin|support|warehouse|content`) + cookie `hajiasal_admin_session`
- Bootstrap: `ADMIN_PASSWORD` when no users / legacy

## Key paths
- UI: `src/components/admin/`
- Permissions: `src/lib/admin/permissions.ts`, `nav.ts`
- Gate: `src/lib/server/admin-gate.ts` → `requireAdminPermission`
- Store: `src/lib/server/admin-platform-store.ts`
- Migration: `mysql-migrations/002_admin_platform.sql`
- Docs: `docs/ADMIN-*.md`

## Rule
Never switch DB engine away from MySQL. Seller panel (`/seller`) is separate — see `CONTEXT-SELLER.md` and `docs/SELLER-*.md`.
