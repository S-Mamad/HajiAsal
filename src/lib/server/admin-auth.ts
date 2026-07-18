import { createHash, randomUUID, timingSafeEqual } from "crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  can,
  isAdminRole,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/permissions";
import {
  createAdminSession,
  validateAdminSessionTokenDetailed,
  revokeAdminSession,
} from "./admin-sessions";
import { isMysqlConfigured, mysqlExecute, mysqlQuery, mysqlQueryOne } from "./mysql";
import { readJsonFile, writeJsonFile } from "./db";
import { canUseFilesystemPersistence } from "./production";

const USERS_FILE = "admin-users.json";

export interface AdminUser {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
  role: AdminRole;
  status: "active" | "disabled";
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAuthContext {
  authenticated: boolean;
  user: AdminUser | null;
  role: AdminRole | null;
  /** Legacy single-password session without user row */
  legacy: boolean;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function hashAdminPassword(password: string): string {
  return hashPassword(password);
}

export function verifyPasswordHash(input: string, expectedHash: string): boolean {
  const inputHash = hashPassword(input);
  try {
    return timingSafeEqual(
      Buffer.from(inputHash, "hex"),
      Buffer.from(expectedHash, "hex"),
    );
  } catch {
    return false;
  }
}

function mapUserRow(row: RowDataPacket): AdminUser {
  const role = isAdminRole(String(row.role)) ? (row.role as AdminRole) : "support";
  return {
    id: String(row.id),
    fullName: String(row.full_name),
    email: row.email ? String(row.email) : null,
    phone: row.phone ? String(row.phone) : null,
    passwordHash: String(row.password_hash),
    role,
    status: row.status === "disabled" ? "disabled" : "active",
    lastLoginAt: row.last_login_at ? String(row.last_login_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function listUsersFs(): Promise<AdminUser[]> {
  return readJsonFile<AdminUser[]>(USERS_FILE, []);
}

async function saveUsersFs(users: AdminUser[]): Promise<void> {
  await writeJsonFile(USERS_FILE, users);
}

export async function countAdminUsers(): Promise<number> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT COUNT(*) AS c FROM admin_users",
      );
      return Number(row?.c ?? 0);
    } catch {
      return 0;
    }
  }
  if (canUseFilesystemPersistence()) {
    return (await listUsersFs()).length;
  }
  return 0;
}

export async function findAdminUserById(id: string): Promise<AdminUser | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM admin_users WHERE id = ? LIMIT 1",
        [id],
      );
      return row ? mapUserRow(row) : null;
    } catch {
      return null;
    }
  }
  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    return users.find((u) => u.id === id) ?? null;
  }
  return null;
}

export async function findAdminUserByLogin(
  login: string,
): Promise<AdminUser | null> {
  const normalized = login.trim().toLowerCase();
  if (!normalized) return null;

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM admin_users
         WHERE LOWER(email) = ? OR phone = ?
         LIMIT 1`,
        [normalized, login.trim()],
      );
      return row ? mapUserRow(row) : null;
    } catch {
      return null;
    }
  }
  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    return (
      users.find(
        (u) =>
          (u.email && u.email.toLowerCase() === normalized) ||
          u.phone === login.trim(),
      ) ?? null
    );
  }
  return null;
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM admin_users ORDER BY created_at DESC",
      );
      return rows.map(mapUserRow);
    } catch {
      return [];
    }
  }
  if (canUseFilesystemPersistence()) {
    return listUsersFs();
  }
  return [];
}

export async function createAdminUser(input: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  role: AdminRole;
}): Promise<AdminUser> {
  const now = new Date().toISOString();
  const user: AdminUser = {
    id: randomUUID(),
    fullName: input.fullName.trim(),
    email: (input.email?.trim() || null) as string | null,
    phone: (input.phone?.trim() || null) as string | null,
    passwordHash: hashPassword(input.password),
    role: input.role,
    status: "active",
    lastLoginAt: null,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO admin_users
        (id, full_name, email, phone, password_hash, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
      [
        user.id,
        user.fullName,
        user.email,
        user.phone,
        user.passwordHash,
        user.role,
        now,
        now,
      ],
    );
    return user;
  }

  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    users.push(user);
    await saveUsersFs(users);
    return user;
  }

  throw new Error("Persistence unavailable");
}

export async function updateAdminUser(
  id: string,
  patch: Partial<{
    fullName: string;
    email: string | null;
    phone: string | null;
    password: string;
    role: AdminRole;
    status: "active" | "disabled";
  }>,
): Promise<AdminUser | null> {
  const existing = await findAdminUserById(id);
  if (!existing) return null;

  const next: AdminUser = {
    ...existing,
    fullName: patch.fullName?.trim() ?? existing.fullName,
    email: patch.email !== undefined ? patch.email : existing.email,
    phone: patch.phone !== undefined ? patch.phone : existing.phone,
    role: patch.role ?? existing.role,
    status: patch.status ?? existing.status,
    passwordHash: patch.password
      ? hashPassword(patch.password)
      : existing.passwordHash,
    updatedAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      `UPDATE admin_users SET
        full_name = ?, email = ?, phone = ?, password_hash = ?, role = ?, status = ?, updated_at = ?
       WHERE id = ?`,
      [
        next.fullName,
        next.email,
        next.phone,
        next.passwordHash,
        next.role,
        next.status,
        next.updatedAt,
        id,
      ],
    );
    return next;
  }

  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    const idx = users.findIndex((u) => u.id === id);
    if (idx < 0) return null;
    users[idx] = next;
    await saveUsersFs(users);
    return next;
  }

  return null;
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  if (isMysqlConfigured()) {
    const result = await mysqlExecute("DELETE FROM admin_users WHERE id = ?", [
      id,
    ]);
    return (result.affectedRows ?? 0) > 0;
  }
  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    const next = users.filter((u) => u.id !== id);
    if (next.length === users.length) return false;
    await saveUsersFs(next);
    return true;
  }
  return false;
}

export async function touchAdminLogin(userId: string): Promise<void> {
  const now = new Date().toISOString();
  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        "UPDATE admin_users SET last_login_at = ? WHERE id = ?",
        [now, userId],
      );
    } catch {
      /* ignore */
    }
    return;
  }
  if (canUseFilesystemPersistence()) {
    const users = await listUsersFs();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx >= 0) {
      users[idx] = { ...users[idx], lastLoginAt: now };
      await saveUsersFs(users);
    }
  }
}

export async function ensureBootstrapSuperAdmin(
  password: string,
): Promise<AdminUser | null> {
  const count = await countAdminUsers();
  if (count > 0) return null;
  return createAdminUser({
    fullName: "مدیر سیستم",
    email: "admin@hajiasal.local",
    phone: null,
    password,
    role: "super_admin",
  });
}

export async function authenticateAdminCredentials(input: {
  password: string;
  login?: string;
}): Promise<{ user: AdminUser | null; legacy: boolean } | null> {
  const password = input.password;
  if (!password) return null;

  const userCount = await countAdminUsers();

  if (input.login) {
    const user = await findAdminUserByLogin(input.login);
    if (!user || user.status !== "active") return null;
    if (!verifyPasswordHash(password, user.passwordHash)) return null;
    return { user, legacy: false };
  }

  // Bootstrap / legacy: ADMIN_PASSWORD when no login provided
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && verifyPasswordHash(password, hashPassword(envPassword))) {
    if (userCount === 0) {
      const created = await ensureBootstrapSuperAdmin(password);
      return { user: created, legacy: !created };
    }
    // Prefer first super_admin
    const users = await listAdminUsers();
    const superAdmin =
      users.find((u) => u.role === "super_admin" && u.status === "active") ??
      users.find((u) => u.status === "active") ??
      null;
    if (superAdmin && verifyPasswordHash(password, superAdmin.passwordHash)) {
      return { user: superAdmin, legacy: false };
    }
    // Env password still works as legacy super when users exist but password matches env
    return { user: superAdmin, legacy: !superAdmin };
  }

  // Try password against any user (single-field login UX fallback)
  const users = await listAdminUsers();
  for (const user of users) {
    if (user.status === "active" && verifyPasswordHash(password, user.passwordHash)) {
      return { user, legacy: false };
    }
  }

  return null;
}

export async function getAdminAuthFromToken(
  token: string | null,
): Promise<AdminAuthContext> {
  const empty: AdminAuthContext = {
    authenticated: false,
    user: null,
    role: null,
    legacy: false,
  };
  if (!token) return empty;

  const session = await validateAdminSessionTokenDetailed(token);
  if (!session.valid) return empty;

  if (session.adminUserId) {
    const user = await findAdminUserById(session.adminUserId);
    if (!user || user.status !== "active") return empty;
    return {
      authenticated: true,
      user,
      role: user.role,
      legacy: false,
    };
  }

  // Legacy session without user id → treat as super_admin
  return {
    authenticated: true,
    user: null,
    role: "super_admin",
    legacy: true,
  };
}

export function adminHasPermission(
  ctx: AdminAuthContext,
  permission: AdminPermission,
): boolean {
  if (!ctx.authenticated) return false;
  return can(ctx.role, permission);
}

export async function requireAdminPermission(
  request: Request,
  permission: AdminPermission,
): Promise<
  | { ok: true; ctx: AdminAuthContext }
  | { ok: false; status: number; message: string }
> {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/hajiasal_admin_session=([^;]+)/);
  const token = match?.[1] ? decodeURIComponent(match[1]) : null;
  const ctx = await getAdminAuthFromToken(token);

  if (!ctx.authenticated) {
    return { ok: false, status: 401, message: "احراز هویت نشده‌اید" };
  }
  if (!adminHasPermission(ctx, permission)) {
    return { ok: false, status: 403, message: "دسترسی مجاز نیست" };
  }
  return { ok: true, ctx };
}

export { revokeAdminSession, createAdminSession };
