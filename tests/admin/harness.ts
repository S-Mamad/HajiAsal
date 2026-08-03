import { vi } from "vitest";
import { can, type AdminPermission, type AdminRole } from "@/lib/admin/permissions";
import type { AdminAuthContext, AdminUser } from "@/lib/server/admin-auth";

export type DeniedAuth = { ok: false; status: number; message: string };
export type AllowedAuth = { ok: true; ctx: AdminAuthContext };

export function makeAdminUser(role: AdminRole, id = `user-${role}`): AdminUser {
  const now = new Date().toISOString();
  return {
    id,
    fullName: `Test ${role}`,
    email: `${role}@test.local`,
    phone: null,
    passwordHash: "scrypt$test$test",
    role,
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
}

export function makeAuthContext(role: AdminRole): AdminAuthContext {
  return {
    authenticated: true,
    user: makeAdminUser(role),
    role,
    legacy: false,
  };
}

/**
 * Mock requireAdminPermission for API handler tests.
 * Call after vi.mock("@/lib/server/admin-auth", ...).
 */
export function installRequireAdminPermissionMock(
  requireAdminPermission: ReturnType<typeof vi.fn>,
) {
  return {
    asUnauthenticated() {
      requireAdminPermission.mockImplementation(async () => ({
        ok: false as const,
        status: 401,
        message: "احراز هویت نشده‌اید",
      }));
    },
    asRole(role: AdminRole) {
      requireAdminPermission.mockImplementation(
        async (_request: Request, permission: AdminPermission) => {
          if (!can(role, permission)) {
            return {
              ok: false as const,
              status: 403,
              message: "دسترسی مجاز نیست",
            };
          }
          return { ok: true as const, ctx: makeAuthContext(role) };
        },
      );
    },
  };
}

export function adminRequest(
  url: string,
  init?: RequestInit & { cookie?: string | null },
): Request {
  const headers = new Headers(init?.headers);
  if (init?.cookie) {
    headers.set("cookie", init.cookie);
  } else if (init?.cookie !== null && !headers.has("cookie")) {
    // default: no session cookie
  }
  return new Request(url, {
    ...init,
    headers,
  });
}

export function authedAdminRequest(
  url: string,
  init?: RequestInit,
): Request {
  return adminRequest(url, {
    ...init,
    cookie: "hajiasal_admin_session=test-token-abcdefghijklmnopqrstuvwxyz",
  });
}

export async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

/** Role that should fail a given permission (prefer warehouse, then support, then content). */
export function pickDeniedRole(permission: AdminPermission): AdminRole | null {
  for (const role of ["warehouse", "support", "content"] as AdminRole[]) {
    if (!can(role, permission)) return role;
  }
  return null;
}
