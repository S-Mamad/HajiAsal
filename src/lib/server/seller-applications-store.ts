import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import { normalizePhone as normalizeIranPhone } from "@/lib/auth/phone";
import { readJsonFile, writeJsonFile } from "./db";
import {
  memoryGetSellerApplications,
  memorySetSellerApplications,
} from "./memory-store";
import { canUseFilesystemPersistence } from "./production";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
} from "./mysql";

export type SellerApplicationStatus = "pending" | "approved" | "rejected";

export interface SellerApplication {
  id: string;
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  address: string;
  bankCard: string;
  productsIntro: string;
  nationalIdFrontUrl: string;
  nationalIdBackUrl?: string | null;
  commitmentLetterUrl: string;
  status: SellerApplicationStatus;
  termsAcceptedAt: string;
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  sellerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type SellerApplicationCreateInput = {
  fullName: string;
  phone: string;
  nationalId: string;
  birthDate: string;
  address: string;
  bankCard: string;
  productsIntro: string;
  nationalIdFrontUrl: string;
  nationalIdBackUrl?: string | null;
  commitmentLetterUrl: string;
  termsAcceptedAt: string;
};

type ApplicationRow = RowDataPacket & Record<string, unknown>;

const RUNTIME_FILE = "seller-applications-runtime.json";

function normalizePhone(phone: string): string {
  return normalizeIranPhone(phone) ?? phone.replace(/\D/g, "");
}

function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? value : d.toISOString();
  }
  return new Date().toISOString();
}

function birthDateOnly(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  const s = String(value ?? "");
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

function mapRow(row: ApplicationRow): SellerApplication {
  return {
    id: String(row.id),
    fullName: String(row.full_name ?? row.fullName ?? ""),
    phone: String(row.phone ?? ""),
    nationalId: String(row.national_id ?? row.nationalId ?? ""),
    birthDate: birthDateOnly(row.birth_date ?? row.birthDate),
    address: String(row.address ?? ""),
    bankCard: String(row.bank_card ?? row.bankCard ?? ""),
    productsIntro: String(row.products_intro ?? row.productsIntro ?? ""),
    nationalIdFrontUrl: String(
      row.national_id_front_url ?? row.nationalIdFrontUrl ?? "",
    ),
    nationalIdBackUrl:
      row.national_id_back_url != null || row.nationalIdBackUrl != null
        ? String(row.national_id_back_url ?? row.nationalIdBackUrl)
        : null,
    commitmentLetterUrl: String(
      row.commitment_letter_url ?? row.commitmentLetterUrl ?? "",
    ),
    status: String(row.status ?? "pending") as SellerApplicationStatus,
    termsAcceptedAt: toIso(row.terms_accepted_at ?? row.termsAcceptedAt),
    reviewNote:
      row.review_note != null || row.reviewNote != null
        ? String(row.review_note ?? row.reviewNote)
        : null,
    reviewedAt:
      row.reviewed_at != null || row.reviewedAt != null
        ? toIso(row.reviewed_at ?? row.reviewedAt)
        : null,
    reviewedBy:
      row.reviewed_by != null || row.reviewedBy != null
        ? String(row.reviewed_by ?? row.reviewedBy)
        : null,
    sellerId:
      row.seller_id != null || row.sellerId != null
        ? String(row.seller_id ?? row.sellerId)
        : null,
    createdAt: toIso(row.created_at ?? row.createdAt),
    updatedAt: toIso(row.updated_at ?? row.updatedAt),
  };
}

async function readLocal(): Promise<SellerApplication[]> {
  if (canUseFilesystemPersistence()) {
    return readJsonFile<SellerApplication[]>(RUNTIME_FILE, []);
  }
  return memoryGetSellerApplications<SellerApplication>();
}

async function writeLocal(apps: SellerApplication[]): Promise<void> {
  if (canUseFilesystemPersistence()) {
    await writeJsonFile(RUNTIME_FILE, apps);
    return;
  }
  memorySetSellerApplications(apps as unknown as Record<string, unknown>[]);
}

export async function listSellerApplicationsAsync(opts?: {
  status?: SellerApplicationStatus | "all";
}): Promise<SellerApplication[]> {
  if (isMysqlConfigured()) {
    try {
      const status = opts?.status && opts.status !== "all" ? opts.status : null;
      const rows = status
        ? await mysqlQuery<ApplicationRow>(
            "SELECT * FROM seller_applications WHERE status = ? ORDER BY created_at DESC",
            [status],
          )
        : await mysqlQuery<ApplicationRow>(
            "SELECT * FROM seller_applications ORDER BY created_at DESC",
          );
      return rows.map(mapRow);
    } catch (error) {
      console.error(
        "[seller-applications] list failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }

  const all = await readLocal();
  const status = opts?.status && opts.status !== "all" ? opts.status : null;
  const filtered = status ? all.filter((a) => a.status === status) : all;
  return filtered.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getSellerApplicationByIdAsync(
  id: string,
): Promise<SellerApplication | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<ApplicationRow>(
        "SELECT * FROM seller_applications WHERE id = ? LIMIT 1",
        [id],
      );
      if (row) return mapRow(row);
    } catch (error) {
      console.error(
        "[seller-applications] get by id failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const all = await readLocal();
  return all.find((a) => a.id === id) ?? null;
}

export async function getPendingApplicationByPhoneAsync(
  phone: string,
): Promise<SellerApplication | null> {
  const normalized = normalizePhone(phone);
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<ApplicationRow>(
        "SELECT * FROM seller_applications WHERE phone = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [normalized],
      );
      if (row) return mapRow(row);
    } catch (error) {
      console.error(
        "[seller-applications] get pending by phone failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  const all = await readLocal();
  return (
    all.find(
      (a) => normalizePhone(a.phone) === normalized && a.status === "pending",
    ) ?? null
  );
}

export async function createSellerApplicationAsync(
  input: SellerApplicationCreateInput,
): Promise<SellerApplication> {
  const phone = normalizePhone(input.phone);
  const existing = await getPendingApplicationByPhoneAsync(phone);
  if (existing) {
    throw new Error("برای این شماره یک درخواست در انتظار بررسی وجود دارد");
  }

  const now = new Date().toISOString();
  const app: SellerApplication = {
    id: randomUUID(),
    fullName: input.fullName.trim(),
    phone,
    nationalId: input.nationalId,
    birthDate: input.birthDate.slice(0, 10),
    address: input.address.trim(),
    bankCard: input.bankCard,
    productsIntro: input.productsIntro.trim(),
    nationalIdFrontUrl: input.nationalIdFrontUrl,
    nationalIdBackUrl: input.nationalIdBackUrl?.trim() || null,
    commitmentLetterUrl: input.commitmentLetterUrl,
    status: "pending",
    termsAcceptedAt: input.termsAcceptedAt,
    createdAt: now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_applications (
          id, full_name, phone, national_id, birth_date, address, bank_card,
          products_intro, national_id_front_url, national_id_back_url,
          commitment_letter_url, status, terms_accepted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
        [
          app.id,
          app.fullName,
          app.phone,
          app.nationalId,
          app.birthDate,
          app.address,
          app.bankCard,
          app.productsIntro,
          app.nationalIdFrontUrl,
          app.nationalIdBackUrl,
          app.commitmentLetterUrl,
          app.termsAcceptedAt,
          app.createdAt,
          app.updatedAt,
        ],
      );
      const saved = await getSellerApplicationByIdAsync(app.id);
      return saved ?? app;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "ثبت درخواست در دیتابیس ناموفق بود",
      );
    }
  }

  const all = await readLocal();
  all.unshift(app);
  await writeLocal(all);
  return app;
}

export async function updateSellerApplicationAsync(
  id: string,
  patch: {
    status?: SellerApplicationStatus;
    reviewNote?: string | null;
    reviewedAt?: string | null;
    reviewedBy?: string | null;
    sellerId?: string | null;
  },
): Promise<SellerApplication | null> {
  const existing = await getSellerApplicationByIdAsync(id);
  if (!existing) return null;

  const now = new Date().toISOString();
  const merged: SellerApplication = {
    ...existing,
    status: patch.status ?? existing.status,
    reviewNote:
      patch.reviewNote !== undefined ? patch.reviewNote : existing.reviewNote,
    reviewedAt:
      patch.reviewedAt !== undefined ? patch.reviewedAt : existing.reviewedAt,
    reviewedBy:
      patch.reviewedBy !== undefined ? patch.reviewedBy : existing.reviewedBy,
    sellerId:
      patch.sellerId !== undefined ? patch.sellerId : existing.sellerId,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `UPDATE seller_applications SET
          status = ?, review_note = ?, reviewed_at = ?, reviewed_by = ?,
          seller_id = ?, updated_at = ?
         WHERE id = ?`,
        [
          merged.status,
          merged.reviewNote ?? null,
          merged.reviewedAt ?? null,
          merged.reviewedBy ?? null,
          merged.sellerId ?? null,
          merged.updatedAt,
          id,
        ],
      );
      return (await getSellerApplicationByIdAsync(id)) ?? merged;
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? error.message
          : "به‌روزرسانی درخواست ناموفق بود",
      );
    }
  }

  const all = await readLocal();
  const next = all.map((a) => (a.id === id ? merged : a));
  await writeLocal(next);
  return merged;
}
