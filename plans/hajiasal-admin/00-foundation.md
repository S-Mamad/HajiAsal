# Foundation — Verification Gates

## Deliverables

- Docs in `docs/ADMIN-*.md`
- `mysql-migrations/002_admin_platform.sql`
- `lib/admin/permissions.ts`, `nav.ts`, export helpers
- Auth multi-user + `requireAdminPermission`
- Admin shell + DataTable v2 + Form + Modal + Toast

## Gates

```bash
cd site/hajiasal
npx tsc --noEmit
npm run lint
```

STOP if MySQL engine is changed or seller panel routes break.
