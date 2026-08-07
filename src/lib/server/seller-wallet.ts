import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import type { StoredOrder } from "./orders";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
  withMysqlTransaction,
} from "./mysql";
import { getAllProductsAsync } from "./products-store";
import { getSellerByIdAsync } from "./sellers-store";

export type WalletBalance = {
  available: number;
  pending: number;
  totalEarned: number;
};

export type LedgerEntry = {
  id: string;
  sellerId: string;
  type: string;
  amount: number;
  status: string;
  referenceType?: string;
  referenceId?: string;
  note?: string;
  createdAt: string;
};

export type Withdrawal = {
  id: string;
  sellerId: string;
  amount: number;
  status: string;
  bankSheba?: string;
  bankCard?: string;
  note?: string;
  adminNote?: string;
  reviewedAt?: string;
  createdAt: string;
};

const memoryLedger: LedgerEntry[] = [];
const memoryWithdrawals: Withdrawal[] = [];

function sumBalanceFromRows(
  rows: Array<{ status: string; total: number }>,
): WalletBalance {
  let available = 0;
  let pending = 0;
  let totalEarned = 0;
  for (const r of rows) {
    const sum = Number(r.total ?? 0);
    if (r.status === "available") available += sum;
    if (r.status === "pending") pending += sum;
    if (sum > 0) totalEarned += sum;
  }
  return { available, pending, totalEarned };
}

export class WalletMysqlError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "WalletMysqlError";
    if (cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = cause;
    }
  }
}

export async function getSellerWalletBalance(
  sellerId: string,
): Promise<WalletBalance> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT status, SUM(amount) AS total
         FROM seller_wallet_ledger
         WHERE seller_id = ?
         GROUP BY status`,
        [sellerId],
      );
      return sumBalanceFromRows(
        rows.map((r) => ({
          status: String(r.status),
          total: Number(r.total ?? 0),
        })),
      );
    } catch (error) {
      throw new WalletMysqlError("خواندن موجودی کیف‌پول ناموفق بود", error);
    }
  }

  let available = 0;
  let pending = 0;
  let totalEarned = 0;
  for (const e of memoryLedger.filter((x) => x.sellerId === sellerId)) {
    if (e.status === "available") available += e.amount;
    if (e.status === "pending") pending += e.amount;
    if (e.amount > 0) totalEarned += e.amount;
  }
  return { available, pending, totalEarned };
}

export async function listSellerLedger(
  sellerId: string,
  limit = 50,
): Promise<LedgerEntry[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_wallet_ledger
         WHERE seller_id = ?
         ORDER BY created_at DESC LIMIT ?`,
        [sellerId, limit],
      );
      return rows.map((r) => ({
        id: String(r.id),
        sellerId: String(r.seller_id),
        type: String(r.type),
        amount: Number(r.amount),
        status: String(r.status),
        referenceType:
          r.reference_type != null ? String(r.reference_type) : undefined,
        referenceId: r.reference_id != null ? String(r.reference_id) : undefined,
        note: r.note != null ? String(r.note) : undefined,
        createdAt: toIso(r.created_at),
      }));
    } catch (error) {
      throw new WalletMysqlError("خواندن دفتر کیف‌پول ناموفق بود", error);
    }
  }
  return memoryLedger.filter((e) => e.sellerId === sellerId).slice(0, limit);
}

export async function addLedgerEntry(input: {
  sellerId: string;
  type: string;
  amount: number;
  status: string;
  referenceType?: string;
  referenceId?: string;
  note?: string;
}): Promise<LedgerEntry> {
  const entry: LedgerEntry = {
    id: randomUUID(),
    sellerId: input.sellerId,
    type: input.type,
    amount: input.amount,
    status: input.status,
    referenceType: input.referenceType,
    referenceId: input.referenceId,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO seller_wallet_ledger
        (id, seller_id, type, amount, status, reference_type, reference_id, note, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.sellerId,
        entry.type,
        entry.amount,
        entry.status,
        entry.referenceType ?? null,
        entry.referenceId ?? null,
        entry.note ?? null,
        entry.createdAt,
      ],
    );
    return entry;
  }

  memoryLedger.unshift(entry);
  return entry;
}

async function hasSaleCredit(
  sellerId: string,
  orderId: string,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT id FROM seller_wallet_ledger
         WHERE seller_id = ? AND type = 'sale' AND reference_type = 'order'
           AND reference_id = ? LIMIT 1`,
        [sellerId, orderId],
      );
      return Boolean(row);
    } catch (error) {
      throw new WalletMysqlError("بررسی اعتبار فروش ناموفق بود", error);
    }
  }
  return memoryLedger.some(
    (e) =>
      e.sellerId === sellerId &&
      e.type === "sale" &&
      e.referenceType === "order" &&
      e.referenceId === orderId,
  );
}

/**
 * Credit each seller's wallet when an order reaches `delivered`.
 * Net = seller line subtotal × (1 − commissionPercent/100). Idempotent per order+seller.
 */
export async function creditSellersForDeliveredOrder(
  order: StoredOrder,
): Promise<void> {
  const products = await getAllProductsAsync({ scope: "admin" });
  const byProduct = new Map(products.map((p) => [p.id, p]));

  const totals = new Map<string, number>();
  for (const item of order.items) {
    const product = byProduct.get(item.productId);
    const sellerId = item.sellerId ?? product?.sellerId;
    if (!sellerId) continue;
    const line = item.weight.price * item.quantity;
    totals.set(sellerId, (totals.get(sellerId) ?? 0) + line);
  }

  for (const [sellerId, subtotal] of totals) {
    if (await hasSaleCredit(sellerId, order.id)) continue;
    const seller = await getSellerByIdAsync(sellerId);
    const commission = Math.min(
      100,
      Math.max(0, seller?.commissionPercent ?? 10),
    );
    const net = Math.max(0, Math.round(subtotal * (1 - commission / 100)));
    if (net <= 0) continue;
    await addLedgerEntry({
      sellerId,
      type: "sale",
      amount: net,
      status: "available",
      referenceType: "order",
      referenceId: order.id,
      note: `فروش سفارش ${order.id} (کمیسیون ${commission}٪)`,
    });
  }
}

async function hasSaleReversal(
  sellerId: string,
  orderId: string,
): Promise<boolean> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT id FROM seller_wallet_ledger
         WHERE seller_id = ? AND type = 'sale_reversal' AND reference_type = 'order'
           AND reference_id = ? LIMIT 1`,
        [sellerId, orderId],
      );
      return Boolean(row);
    } catch (error) {
      throw new WalletMysqlError("بررسی برگشت فروش ناموفق بود", error);
    }
  }
  return memoryLedger.some(
    (e) =>
      e.sellerId === sellerId &&
      e.type === "sale_reversal" &&
      e.referenceType === "order" &&
      e.referenceId === orderId,
  );
}

/**
 * Claw back sale credits when an admin refunds a delivered order.
 * Idempotent per order+seller via sale_reversal ledger rows.
 */
export async function reverseSaleCreditsForOrder(
  order: StoredOrder,
): Promise<void> {
  const products = await getAllProductsAsync({ scope: "admin" });
  const byProduct = new Map(products.map((p) => [p.id, p]));

  const totals = new Map<string, number>();
  for (const item of order.items) {
    const product = byProduct.get(item.productId);
    const sellerId = item.sellerId ?? product?.sellerId;
    if (!sellerId) continue;
    const line = item.weight.price * item.quantity;
    totals.set(sellerId, (totals.get(sellerId) ?? 0) + line);
  }

  for (const [sellerId, subtotal] of totals) {
    if (!(await hasSaleCredit(sellerId, order.id))) continue;
    if (await hasSaleReversal(sellerId, order.id)) continue;
    const seller = await getSellerByIdAsync(sellerId);
    const commission = Math.min(
      100,
      Math.max(0, seller?.commissionPercent ?? 10),
    );
    const net = Math.max(0, Math.round(subtotal * (1 - commission / 100)));
    if (net <= 0) continue;
    await addLedgerEntry({
      sellerId,
      type: "sale_reversal",
      amount: -net,
      status: "available",
      referenceType: "order",
      referenceId: order.id,
      note: `برگشت فروش سفارش ${order.id} (استرداد ادمین)`,
    });
  }
}

export async function createWithdrawal(input: {
  sellerId: string;
  amount: number;
  bankSheba?: string;
  bankCard?: string;
  note?: string;
}): Promise<Withdrawal> {
  const sheba = input.bankSheba?.trim();
  if (!sheba) {
    throw new Error("شماره شبا برای تسویه الزامی است");
  }

  const w: Withdrawal = {
    id: randomUUID(),
    sellerId: input.sellerId,
    amount: input.amount,
    status: "pending",
    bankSheba: sheba,
    bankCard: input.bankCard,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    await withMysqlTransaction(async (conn) => {
      // Lock existing ledger rows for this seller to serialize concurrent withdraws
      await conn.execute(
        `SELECT id FROM seller_wallet_ledger WHERE seller_id = ? FOR UPDATE`,
        [input.sellerId],
      );
      const [sumRows] = await conn.query<RowDataPacket[]>(
        `SELECT COALESCE(SUM(amount), 0) AS available
         FROM seller_wallet_ledger
         WHERE seller_id = ? AND status = 'available'`,
        [input.sellerId],
      );
      const available = Number(sumRows[0]?.available ?? 0);
      if (input.amount <= 0 || input.amount > available) {
        throw new Error("مبلغ برداشت نامعتبر است");
      }

      await conn.execute(
        `INSERT INTO seller_withdrawals
          (id, seller_id, amount, status, bank_sheba, bank_card, note, created_at, updated_at)
         VALUES (?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          w.id,
          w.sellerId,
          w.amount,
          w.bankSheba ?? null,
          w.bankCard ?? null,
          w.note ?? null,
          w.createdAt,
          w.createdAt,
        ],
      );

      const ledgerId = randomUUID();
      await conn.execute(
        `INSERT INTO seller_wallet_ledger
          (id, seller_id, type, amount, status, reference_type, reference_id, note, created_at)
         VALUES (?, ?, 'withdrawal_hold', ?, 'available', 'withdrawal', ?, ?, ?)`,
        [
          ledgerId,
          input.sellerId,
          -input.amount,
          w.id,
          "مسدودسازی برای درخواست تسویه",
          w.createdAt,
        ],
      );
    });
    return w;
  }

  const balance = await getSellerWalletBalance(input.sellerId);
  if (input.amount <= 0 || input.amount > balance.available) {
    throw new Error("مبلغ برداشت نامعتبر است");
  }

  memoryWithdrawals.unshift(w);
  memoryLedger.unshift({
    id: randomUUID(),
    sellerId: input.sellerId,
    type: "withdrawal_hold",
    amount: -input.amount,
    status: "available",
    referenceType: "withdrawal",
    referenceId: w.id,
    note: "مسدودسازی برای درخواست تسویه",
    createdAt: w.createdAt,
  });
  return w;
}

export async function listWithdrawals(sellerId: string): Promise<Withdrawal[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_withdrawals WHERE seller_id = ? ORDER BY created_at DESC`,
        [sellerId],
      );
      return rows.map(mapWithdrawal);
    } catch (error) {
      throw new WalletMysqlError("خواندن درخواست‌های تسویه ناموفق بود", error);
    }
  }
  return memoryWithdrawals.filter((w) => w.sellerId === sellerId);
}

export async function reviewWithdrawal(input: {
  withdrawalId: string;
  sellerId: string;
  status: "approved" | "rejected";
  adminNote?: string;
}): Promise<Withdrawal | null> {
  const now = new Date().toISOString();
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM seller_withdrawals WHERE id = ? AND seller_id = ? LIMIT 1`,
        [input.withdrawalId, input.sellerId],
      );
      if (!row || String(row.status) !== "pending") return null;

      const result = await mysqlExecute(
        `UPDATE seller_withdrawals
         SET status = ?, admin_note = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ? AND seller_id = ? AND status = 'pending'`,
        [
          input.status,
          input.adminNote ?? null,
          now,
          now,
          input.withdrawalId,
          input.sellerId,
        ],
      );
      if (!result.affectedRows) return null;

      if (input.status === "rejected") {
        await addLedgerEntry({
          sellerId: input.sellerId,
          type: "withdrawal_release",
          amount: Number(row.amount),
          status: "available",
          referenceType: "withdrawal",
          referenceId: input.withdrawalId,
          note: "آزادسازی پس از رد تسویه",
        });
      }

      const updated = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM seller_withdrawals WHERE id = ? LIMIT 1`,
        [input.withdrawalId],
      );
      return updated ? mapWithdrawal(updated) : null;
    } catch (error) {
      console.error("[wallet] review failed", error);
      return null;
    }
  }

  const w = memoryWithdrawals.find(
    (x) => x.id === input.withdrawalId && x.sellerId === input.sellerId,
  );
  if (!w || w.status !== "pending") return null;
  w.status = input.status;
  w.adminNote = input.adminNote;
  w.reviewedAt = now;
  if (input.status === "rejected") {
    await addLedgerEntry({
      sellerId: input.sellerId,
      type: "withdrawal_release",
      amount: w.amount,
      status: "available",
      referenceType: "withdrawal",
      referenceId: w.id,
    });
  }
  return w;
}

function mapWithdrawal(r: RowDataPacket): Withdrawal {
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    amount: Number(r.amount),
    status: String(r.status),
    bankSheba: r.bank_sheba != null ? String(r.bank_sheba) : undefined,
    bankCard: r.bank_card != null ? String(r.bank_card) : undefined,
    note: r.note != null ? String(r.note) : undefined,
    adminNote: r.admin_note != null ? String(r.admin_note) : undefined,
    reviewedAt: r.reviewed_at ? toIso(r.reviewed_at) : undefined,
    createdAt: toIso(r.created_at),
  };
}

/** @internal test helper */
export function __resetSellerWalletMemoryForTests(): void {
  memoryLedger.length = 0;
  memoryWithdrawals.length = 0;
}
