import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "crypto";
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
const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 64;

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

function isScryptHash(hash: string): boolean {
  return hash.startsWith(SCRYPT_PREFIX);
}

function isLegacySha256Hash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash);
}

function hashLegacySha256(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function hashAdminPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, SCRYPT_KEYLEN).toString("hex");
  return `${SCRYPT_PREFIX}${salt}$${derived}`;
}

function hashPassword(password: string): string {
  return hashAdminPassword(password);
}

export function isPasswordHashLegacy(hash: string): boolean {
  return isLegacySha256Hash(hash);
}

export function verifyPasswordHash(input: string, expectedHash: string): boolean {
  if (isScryptHash(expectedHash)) {
    const parts = expectedHash.split("$");
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const hash = parts[2];
    if (!salt || !hash) return false;
    const derived = scryptSync(input, salt, SCRYPT_KEYLEN).toString("hex");
    try {
      return timingSafeEqual(
        Buffer.from(derived, "hex"),
        Buffer.from(hash, "hex"),
      );
    } catch {
      return false;
    }
  }

  if (isLegacySha256Hash(expectedHash)) {
    const inputHash = hashLegacySha256(input);
    try {
      return timingSafeEqual(
        Buffer.from(inputHash, "hex"),
        Buffer.from(expectedHash, "hex"),
      );
    } catch {
      return false;
    }
  }

  return false;
}

function safeEqualString(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  try {
    return timingSafeEqual(aBuf, bBuf);
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
      /* fall through */
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
      if (row) return mapUserRow(row);
    } catch {
      /* fall through */
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
      if (row) return mapUserRow(row);
    } catch {
      /* fall through */
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
      /* fall through */
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
    try {
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
    } catch (error) {
      console.error(
        "[admin-auth] createAdminUser mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
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
    try {
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
    } catch (error) {
      console.error(
        "[admin-auth] updateAdminUser mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
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
    try {
      const result = await mysqlExecute("DELETE FROM admin_users WHERE id = ?", [
        id,
      ]);
      return (result.affectedRows ?? 0) > 0;
    } catch (error) {
      console.error(
        "[admin-auth] deleteAdminUser mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
    }
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

async function maybeMigratePasswordHash(
  user: AdminUser,
  password: string,
): Promise<AdminUser> {
  if (!isPasswordHashLegacy(user.passwordHash)) return user;
  const updated = await updateAdminUser(user.id, { password });
  return updated ?? user;
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
    const migrated = await maybeMigratePasswordHash(user, password);
    return { user: migrated, legacy: false };
  }

  // After bootstrap, login identifier (email/phone) is required.
  if (userCount > 0) {
    return null;
  }

  // Bootstrap only: ADMIN_PASSWORD when no admin users exist yet
  const envPassword = process.env.ADMIN_PASSWORD;
  if (envPassword && safeEqualString(password, envPassword)) {
    try {
      const created = await ensureBootstrapSuperAdmin(password);
      return { user: created, legacy: !created };
    } catch (error) {
      console.error(
        "[admin-auth] bootstrap failed, using legacy session:",
        error instanceof Error ? error.message : error,
      );
      return { user: null, legacy: true };
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

  // Legacy unbound sessions are only allowed when no admin users exist yet
  // (bootstrap escape hatch). Otherwise deny — never auto-promote to super_admin.
  const userCount = await countAdminUsers();
  if (userCount === 0) {
    return {
      authenticated: true,
      user: null,
      role: "super_admin",
      legacy: true,
    };
  }

  return empty;
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
