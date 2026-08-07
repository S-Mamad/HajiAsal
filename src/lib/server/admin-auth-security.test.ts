import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./mysql", () => ({
  isMysqlConfigured: vi.fn(() => false),
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  newId: vi.fn(() => "test-id"),
  toIso: (v: unknown) => String(v),
}));

vi.mock("./db", () => ({
  readJsonFile: vi.fn(async (_f: string, fallback: unknown) => fallback),
  writeJsonFile: vi.fn(async () => undefined),
  appendToJsonArray: vi.fn(async () => undefined),
}));

vi.mock("./production", () => ({
  canUseFilesystemPersistence: vi.fn(() => true),
  isProduction: vi.fn(() => false),
}));

import {
  authenticateAdminCredentials,
  hashAdminPassword,
  isPasswordHashLegacy,
  verifyPasswordHash,
} from "./admin-auth";
import {
  checkAdminLoginRateLimit,
  recordAdminLoginAttempt,
  __resetAdminRateLimitForTests,
} from "./admin-rate-limit";
import {
  createAdminSession,
  validateAdminSessionToken,
  revokeAdminSession,
} from "./admin-sessions";
import {
  memoryGetAdminSessions,
  memorySetAdminSessions,
} from "./memory-store";
import { isMysqlConfigured, mysqlExecute, mysqlQueryOne } from "./mysql";
import { canUseFilesystemPersistence, isProduction } from "./production";
import { readJsonFile, writeJsonFile } from "./db";
import {
  canAccessAdminPath,
  findNavItemForPath,
  firstAllowedAdminPath,
} from "@/lib/admin/nav";
import { hajiasalPath } from "@/lib/paths";

describe("admin password hashing", () => {
  it("creates scrypt hashes and verifies them", () => {
    const hash = hashAdminPassword("secret-pass");
    expect(hash.startsWith("scrypt$")).toBe(true);
    expect(verifyPasswordHash("secret-pass", hash)).toBe(true);
    expect(verifyPasswordHash("wrong", hash)).toBe(false);
    expect(isPasswordHashLegacy(hash)).toBe(false);
  });

  it("verifies legacy sha256 hashes", () => {
    const legacy = createHash("sha256").update("old-pass").digest("hex");
    expect(isPasswordHashLegacy(legacy)).toBe(true);
    expect(verifyPasswordHash("old-pass", legacy)).toBe(true);
    expect(verifyPasswordHash("nope", legacy)).toBe(false);
  });
});

describe("authenticateAdminCredentials backdoor", () => {
  const prevEnv = process.env.ADMIN_PASSWORD;

  beforeEach(() => {
    process.env.ADMIN_PASSWORD = "env-only-secret";
    vi.mocked(isMysqlConfigured).mockReturnValue(false);
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(true);
  });

  afterEach(() => {
    process.env.ADMIN_PASSWORD = prevEnv;
  });

  it("rejects ADMIN_PASSWORD alone when users already exist", async () => {
    const user = {
      id: "u1",
      fullName: "Admin",
      email: "a@b.c",
      phone: null,
      passwordHash: hashAdminPassword("user-pass"),
      role: "super_admin" as const,
      status: "active" as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    vi.mocked(readJsonFile).mockImplementation(async (file, fallback) => {
      if (file === "admin-users.json") return [user] as never;
      return fallback as never;
    });

    const denied = await authenticateAdminCredentials({
      password: "env-only-secret",
    });
    expect(denied).toBeNull();

    // Password-only (no login) is rejected after users exist
    const passwordOnly = await authenticateAdminCredentials({
      password: "user-pass",
    });
    expect(passwordOnly).toBeNull();

    const ok = await authenticateAdminCredentials({
      login: "a@b.c",
      password: "user-pass",
    });
    expect(ok?.user?.id).toBe("u1");
  });

  it("keeps adminUserId on memory fallback when MySQL insert fails", async () => {
    vi.mocked(isMysqlConfigured).mockReturnValue(true);
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(false);
    memorySetAdminSessions([]);
    vi.mocked(mysqlExecute).mockRejectedValueOnce(
      Object.assign(new Error("Deadlock found"), { errno: 1213 }),
    );

    const created = await createAdminSession({ adminUserId: "support-1" });
    expect(created?.token).toBeTruthy();
    expect(memoryGetAdminSessions()[0]?.adminUserId).toBe("support-1");
  });
});

describe("admin rate limit memory fallback", () => {
  beforeEach(() => {
    __resetAdminRateLimitForTests();
    vi.mocked(isMysqlConfigured).mockReturnValue(true);
    vi.mocked(mysqlExecute).mockRejectedValue(new Error("mysql down"));
    vi.mocked(mysqlQueryOne).mockRejectedValue(new Error("mysql down"));
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(false);
  });

  afterEach(() => {
    __resetAdminRateLimitForTests();
  });

  it("records failed attempts in memory when MySQL insert fails", async () => {
    const ip = "203.0.113.50";
    for (let i = 0; i < 5; i++) {
      await recordAdminLoginAttempt(ip, false);
    }
    const limited = await checkAdminLoginRateLimit(ip);
    expect(limited.allowed).toBe(false);
  });
});

describe("admin session dual-write", () => {
  beforeEach(() => {
    memorySetAdminSessions([]);
    vi.mocked(isMysqlConfigured).mockReturnValue(true);
    vi.mocked(mysqlExecute).mockResolvedValue({ affectedRows: 1 } as never);
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(false);
  });

  afterEach(() => {
    memorySetAdminSessions([]);
  });

  it("mirrors MySQL session to memory so validate works without DB", async () => {
    const created = await createAdminSession({ adminUserId: "admin-1" });
    expect(created?.token).toBeTruthy();
    expect(memoryGetAdminSessions().length).toBe(1);

    // Simulate MySQL down on validate path
    vi.mocked(isMysqlConfigured).mockReturnValue(true);
    vi.mocked(mysqlQueryOne).mockRejectedValue(new Error("mysql down"));

    const valid = await validateAdminSessionToken(created!.token);
    expect(valid).toBe(true);

    await revokeAdminSession(created!.token);
    const after = await validateAdminSessionToken(created!.token);
    expect(after).toBe(false);
  });

  it("writes to filesystem when available alongside MySQL", async () => {
    const sessions: unknown[] = [];
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(true);
    vi.mocked(readJsonFile).mockImplementation(async () => sessions as never);
    vi.mocked(writeJsonFile).mockImplementation(async (_f, data) => {
      sessions.splice(0, sessions.length, ...(data as unknown[]));
    });

    const created = await createAdminSession({ adminUserId: "admin-2" });
    expect(created).toBeTruthy();
    expect(sessions.length).toBe(1);
  });

  it("refuses memory-only sessions when MySQL fails in production", async () => {
    vi.mocked(isMysqlConfigured).mockReturnValue(true);
    vi.mocked(mysqlExecute).mockRejectedValue(new Error("mysql down"));
    vi.mocked(canUseFilesystemPersistence).mockReturnValue(false);
    vi.mocked(isProduction).mockReturnValue(true);

    const created = await createAdminSession({ adminUserId: "admin-3" });
    expect(created).toBeNull();
    expect(memoryGetAdminSessions().length).toBe(0);

    vi.mocked(isProduction).mockReturnValue(false);
  });
});

describe("admin nav path access", () => {
  it("maps product paths to products.view", () => {
    const item = findNavItemForPath(hajiasalPath("/admin/products/edit/1"));
    expect(item?.permission).toBe("products.view");
  });

  it("denies support from settings path", () => {
    expect(
      canAccessAdminPath("support", hajiasalPath("/admin/settings")),
    ).toBe(false);
    expect(
      canAccessAdminPath("super_admin", hajiasalPath("/admin/settings")),
    ).toBe(true);
  });

  it("returns a first allowed path for warehouse", () => {
    const path = firstAllowedAdminPath("warehouse");
    expect(path).toContain("/admin/");
  });
});
