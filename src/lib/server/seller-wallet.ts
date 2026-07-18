import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "./mysql";

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
      let available = 0;
      let pending = 0;
      let totalEarned = 0;
      for (const r of rows) {
        const sum = Number(r.total ?? 0);
        const status = String(r.status);
        if (status === "available") available += sum;
        if (status === "pending") pending += sum;
        if (sum > 0) totalEarned += sum;
      }
      return { available, pending, totalEarned };
    } catch {
      /* fall through */
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
    } catch {
      /* fall through */
    }
  }
  return memoryLedger
    .filter((e) => e.sellerId === sellerId)
    .slice(0, limit);
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
    try {
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
    } catch (error) {
      console.error("[wallet] ledger insert failed", error);
    }
  }
  memoryLedger.unshift(entry);
  return entry;
}

export async function createWithdrawal(input: {
  sellerId: string;
  amount: number;
  bankSheba?: string;
  bankCard?: string;
  note?: string;
}): Promise<Withdrawal> {
  const balance = await getSellerWalletBalance(input.sellerId);
  if (input.amount <= 0 || input.amount > balance.available) {
    throw new Error("مبلغ برداشت نامعتبر است");
  }

  const w: Withdrawal = {
    id: randomUUID(),
    sellerId: input.sellerId,
    amount: input.amount,
    status: "pending",
    bankSheba: input.bankSheba,
    bankCard: input.bankCard,
    note: input.note,
    createdAt: new Date().toISOString(),
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
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
      await addLedgerEntry({
        sellerId: input.sellerId,
        type: "withdrawal_hold",
        amount: -input.amount,
        status: "available",
        referenceType: "withdrawal",
        referenceId: w.id,
        note: "مسدودسازی برای درخواست تسویه",
      });
      return w;
    } catch (error) {
      console.error("[wallet] withdraw failed", error);
      throw new Error("ثبت درخواست تسویه ناموفق بود");
    }
  }

  memoryWithdrawals.unshift(w);
  await addLedgerEntry({
    sellerId: input.sellerId,
    type: "withdrawal_hold",
    amount: -input.amount,
    status: "available",
    referenceType: "withdrawal",
    referenceId: w.id,
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
    } catch {
      /* fall through */
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

      await mysqlExecute(
        `UPDATE seller_withdrawals
         SET status = ?, admin_note = ?, reviewed_at = ?, updated_at = ?
         WHERE id = ?`,
        [input.status, input.adminNote ?? null, now, now, input.withdrawalId],
      );

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
