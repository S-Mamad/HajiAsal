import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import sellersSeed from "@/data/sellers.json";
import { readJsonFile, writeJsonFile } from "./db";
import { memoryGetSellers, memorySetSellers } from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import {
  isDuplicateKeyError,
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
} from "./mysql";

type SellerRow = RowDataPacket & Record<string, unknown>;

export type SellerStatus = "pending" | "active" | "suspended" | "rejected";

export interface Seller {
  id: string;
  shopName: string;
  ownerName: string;
  phone: string;
  passwordHash: string;
  city: string;
  status: SellerStatus;
  isDemo?: boolean;
  notes?: string;
  commissionPercent: number;
  joinedAt: string;
  reviewedAt?: string;
  reviewNote?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type PublicSeller = Omit<Seller, "passwordHash" | "isDemo">;

export type SellerCreateInput = {
  shopName: string;
  ownerName: string;
  phone: string;
  password: string;
  city?: string;
  status?: SellerStatus;
  notes?: string;
  commissionPercent?: number;
  isDemo?: boolean;
};

export type SellerUpdateInput = {
  shopName?: string;
  ownerName?: string;
  phone?: string;
  password?: string;
  city?: string;
  status?: SellerStatus;
  notes?: string | null;
  commissionPercent?: number;
  reviewNote?: string | null;
};

const SELLERS_RUNTIME_FILE = "sellers-runtime.json";
const seedSellers = sellersSeed as Seller[];

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function hashSellerPassword(password: string): string {
  const salt = randomBytes(16).toString("base64url");
  const hash = scryptSync(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  }).toString("base64url");
  return `scrypt$${salt}$${hash}`;
}

export function toPublicSeller(seller: Seller): PublicSeller {
  const { passwordHash: _hash, isDemo: _demo, ...rest } = seller;
  return rest;
}

function mapRowToSeller(row: Record<string, unknown>): Seller {
  return {
    id: String(row.id),
    shopName: String(row.shop_name ?? row.shopName ?? ""),
    ownerName: String(row.owner_name ?? row.ownerName ?? ""),
    phone: String(row.phone ?? ""),
    passwordHash: String(row.password_hash ?? row.passwordHash ?? ""),
    city: String(row.city ?? ""),
    status: (row.status as SellerStatus) ?? "pending",
    isDemo: Boolean(row.is_demo ?? row.isDemo ?? false),
    notes: row.notes != null ? String(row.notes) : undefined,
    commissionPercent: Number(row.commission_percent ?? row.commissionPercent ?? 10),
    joinedAt: String(row.joined_at ?? row.joinedAt ?? new Date().toISOString()),
    reviewedAt: row.reviewed_at
      ? String(row.reviewed_at)
      : row.reviewedAt
        ? String(row.reviewedAt)
        : undefined,
    reviewNote: row.review_note
      ? String(row.review_note)
      : row.reviewNote
        ? String(row.reviewNote)
        : undefined,
    createdAt: row.created_at
      ? String(row.created_at)
      : row.createdAt
        ? String(row.createdAt)
        : undefined,
    updatedAt: row.updated_at
      ? String(row.updated_at)
      : row.updatedAt
        ? String(row.updatedAt)
        : undefined,
  };
}

function sellerToRow(seller: Seller) {
  return {
    id: seller.id,
    shop_name: seller.shopName,
    owner_name: seller.ownerName,
    phone: seller.phone,
    password_hash: seller.passwordHash,
    city: seller.city,
    status: seller.status,
    is_demo: seller.isDemo ?? false,
    notes: seller.notes ?? null,
    commission_percent: seller.commissionPercent,
    joined_at: seller.joinedAt,
    reviewed_at: seller.reviewedAt ?? null,
    review_note: seller.reviewNote ?? null,
    updated_at: new Date().toISOString(),
  };
}

type SellerRowShape = ReturnType<typeof sellerToRow>;

function sellerInsertParams(row: SellerRowShape, createdAt: string): unknown[] {
  return [
    row.id,
    row.shop_name,
    row.owner_name,
    row.phone,
    row.password_hash,
    row.city,
    row.status,
    row.is_demo,
    row.notes,
    row.commission_percent,
    row.joined_at,
    row.reviewed_at,
    row.review_note,
    row.updated_at,
    createdAt,
  ];
}

function sellerUpdateParams(row: SellerRowShape): unknown[] {
  return [
    row.shop_name,
    row.owner_name,
    row.phone,
    row.password_hash,
    row.city,
    row.status,
    row.is_demo,
    row.notes,
    row.commission_percent,
    row.joined_at,
    row.reviewed_at,
    row.review_note,
    row.updated_at,
    row.id,
  ];
}

const SELLER_INSERT_SQL = `INSERT INTO sellers (
    id, shop_name, owner_name, phone, password_hash, city, status, is_demo, notes,
    commission_percent, joined_at, reviewed_at, review_note, updated_at, created_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const SELLER_UPDATE_SQL = `UPDATE sellers SET
    shop_name = ?, owner_name = ?, phone = ?, password_hash = ?, city = ?, status = ?,
    is_demo = ?, notes = ?, commission_percent = ?, joined_at = ?, reviewed_at = ?,
    review_note = ?, updated_at = ?
  WHERE id = ?`;

function normalizeSeedSeller(s: Seller): Seller {
  return {
    ...s,
    commissionPercent: s.commissionPercent ?? 10,
    status: s.status ?? "active",
  };
}

async function readLocalSellers(): Promise<Seller[]> {
  const seeded = seedSellers.map(normalizeSeedSeller);
  let runtime: Seller[] = [];

  if (canUseFilesystemPersistence()) {
    runtime = await readJsonFile<Seller[]>(SELLERS_RUNTIME_FILE, []);
  } else {
    runtime = memoryGetSellers<Seller>();
  }

  const byId = new Map<string, Seller>();
  for (const s of seeded) byId.set(s.id, s);
  for (const s of runtime) byId.set(s.id, normalizeSeedSeller(s));
  return Array.from(byId.values()).sort((a, b) =>
    b.joinedAt.localeCompare(a.joinedAt),
  );
}

async function writeLocalSellers(sellers: Seller[]): Promise<void> {
  const seedIds = new Set(seedSellers.map((s) => s.id));
  // Persist non-seed + modified seed accounts fully (simpler: persist all runtime overrides).
  const toPersist = sellers.filter(
    (s) =>
      !seedIds.has(s.id) ||
      JSON.stringify(normalizeSeedSeller(seedSellers.find((x) => x.id === s.id)!)) !==
        JSON.stringify(s),
  );

  if (canUseFilesystemPersistence()) {
    await writeJsonFile(SELLERS_RUNTIME_FILE, toPersist);
    return;
  }
  memorySetSellers(toPersist as unknown as Record<string, unknown>[]);
}

async function fetchSellersFromMysql(): Promise<Seller[] | null> {
  if (!isMysqlConfigured()) return null;

  try {
    const rows = await mysqlQuery<SellerRow>(
      "SELECT * FROM sellers ORDER BY joined_at DESC",
    );
    return rows.map((row) => mapRowToSeller(row));
  } catch (error) {
    console.error(
      "[sellers] fetch failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}

export async function getAllSellersAsync(): Promise<Seller[]> {
  const fromDb = await fetchSellersFromMysql();
  if (fromDb === null) return readLocalSellers();
  if (fromDb.length === 0) return readLocalSellers();

  // Merge: DB wins on id; seed/local fills gaps so empty-ish DB doesn't hide demos.
  const local = await readLocalSellers();
  const byId = new Map<string, Seller>();
  for (const s of local) byId.set(s.id, s);
  for (const s of fromDb) byId.set(s.id, s);
  return Array.from(byId.values()).sort((a, b) =>
    b.joinedAt.localeCompare(a.joinedAt),
  );
}

export async function getSellerByIdAsync(id: string): Promise<Seller | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<SellerRow>(
        "SELECT * FROM sellers WHERE id = ? LIMIT 1",
        [id],
      );
      if (row) return mapRowToSeller(row);
    } catch (error) {
      console.error(
        "[sellers] get by id failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const all = await readLocalSellers();
  return all.find((s) => s.id === id) ?? null;
}

export async function getSellerByPhoneAsync(
  phone: string,
): Promise<Seller | null> {
  const normalized = normalizePhone(phone);
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<SellerRow>(
        "SELECT * FROM sellers WHERE phone = ? LIMIT 1",
        [normalized],
      );
      if (row) return mapRowToSeller(row);
    } catch (error) {
      console.error(
        "[sellers] get by phone failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const all = await readLocalSellers();
  return all.find((s) => normalizePhone(s.phone) === normalized) ?? null;
}

export async function getActiveSellerIdsAsync(): Promise<Set<string>> {
  const all = await getAllSellersAsync();
  return new Set(all.filter((s) => s.status === "active").map((s) => s.id));
}

function nextSellerId(existing: Seller[]): string {
  let max = 0;
  for (const s of existing) {
    const m = /^s(\d+)$/i.exec(s.id);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `s${max + 1}`;
}

export async function createSellerAsync(
  input: SellerCreateInput,
): Promise<Seller> {
  const phone = input.phone.trim();
  if (normalizePhone(phone).length < 10) {
    throw new Error("شماره موبایل معتبر نیست");
  }

  const existingPhone = await getSellerByPhoneAsync(phone);
  if (existingPhone) {
    throw new Error("این شماره قبلاً برای فروشنده دیگری ثبت شده است");
  }

  const all = await getAllSellersAsync();
  const now = new Date().toISOString();
  const status = input.status ?? "active";
  const seller: Seller = {
    id: nextSellerId(all),
    shopName: input.shopName.trim(),
    ownerName: input.ownerName.trim(),
    phone,
    passwordHash: hashSellerPassword(input.password),
    city: (input.city ?? "").trim(),
    status,
    isDemo: input.isDemo ?? false,
    notes: input.notes?.trim() || undefined,
    commissionPercent: input.commissionPercent ?? 10,
    joinedAt: now.split("T")[0]!,
    reviewedAt: status === "active" || status === "rejected" ? now : undefined,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      const row = sellerToRow(seller);
      await mysqlExecute(SELLER_INSERT_SQL, sellerInsertParams(row, now));
      const saved = await mysqlQueryOne<SellerRow>(
        "SELECT * FROM sellers WHERE id = ? LIMIT 1",
        [seller.id],
      );
      if (saved) return mapRowToSeller(saved);
      return seller;
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error("این شماره قبلاً برای فروشنده دیگری ثبت شده است");
      }
      throw new Error(
        error instanceof Error ? error.message : "ایجاد فروشنده در دیتابیس ناموفق بود",
      );
    }
  }

  const next = [seller, ...all.filter((s) => s.id !== seller.id)];
  await writeLocalSellers(next);
  return seller;
}

export async function updateSellerAsync(
  id: string,
  input: SellerUpdateInput,
): Promise<Seller | null> {
  const existing = await getSellerByIdAsync(id);
  if (!existing) return null;

  if (input.phone) {
    const other = await getSellerByPhoneAsync(input.phone);
    if (other && other.id !== id) {
      throw new Error("این شماره قبلاً برای فروشنده دیگری ثبت شده است");
    }
  }

  const now = new Date().toISOString();
  const statusChanged =
    input.status !== undefined && input.status !== existing.status;

  const merged: Seller = {
    ...existing,
    shopName: input.shopName?.trim() ?? existing.shopName,
    ownerName: input.ownerName?.trim() ?? existing.ownerName,
    phone: input.phone?.trim() ?? existing.phone,
    passwordHash: input.password
      ? hashSellerPassword(input.password)
      : existing.passwordHash,
    city: input.city !== undefined ? input.city.trim() : existing.city,
    status: input.status ?? existing.status,
    notes:
      input.notes === null
        ? undefined
        : input.notes !== undefined
          ? input.notes.trim() || undefined
          : existing.notes,
    commissionPercent:
      input.commissionPercent !== undefined
        ? input.commissionPercent
        : existing.commissionPercent,
    reviewNote:
      input.reviewNote === null
        ? undefined
        : input.reviewNote !== undefined
          ? input.reviewNote.trim() || undefined
          : existing.reviewNote,
    reviewedAt: statusChanged ? now : existing.reviewedAt,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      const row = sellerToRow(merged);
      const result = await mysqlExecute(SELLER_UPDATE_SQL, sellerUpdateParams(row));
      if (result.affectedRows > 0) {
        const saved = await mysqlQueryOne<SellerRow>(
          "SELECT * FROM sellers WHERE id = ? LIMIT 1",
          [id],
        );
        if (saved) return mapRowToSeller(saved);
      }
      throw new Error("به‌روزرسانی فروشنده ناموفق بود");
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error("این شماره قبلاً برای فروشنده دیگری ثبت شده است");
      }
      throw error instanceof Error
        ? error
        : new Error("به‌روزرسانی فروشنده ناموفق بود");
    }
  }

  const all = await readLocalSellers();
  const next = all.map((s) => (s.id === id ? merged : s));
  await writeLocalSellers(next);
  return merged;
}

export async function deleteSellerAsync(id: string): Promise<boolean> {
  const existing = await getSellerByIdAsync(id);
  if (!existing) return false;

  if (isMysqlConfigured()) {
    try {
      const result = await mysqlExecute("DELETE FROM sellers WHERE id = ?", [id]);
      return result.affectedRows > 0;
    } catch (error) {
      throw error instanceof Error ? error : new Error("حذف فروشنده ناموفق بود");
    }
  }

  const all = await readLocalSellers();
  await writeLocalSellers(all.filter((s) => s.id !== id));
  return true;
}

/** Sync helpers for callers that still expect sync seed lookup (prefer async). */
export function getAllSellersSync(): Seller[] {
  return seedSellers.map(normalizeSeedSeller);
}

export function getSellerByIdSync(id: string): Seller | null {
  return getAllSellersSync().find((s) => s.id === id) ?? null;
}

export function getSellerByPhoneSync(phone: string): Seller | null {
  const normalized = normalizePhone(phone);
  return (
    getAllSellersSync().find((s) => normalizePhone(s.phone) === normalized) ??
    null
  );
}
