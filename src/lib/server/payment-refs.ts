import { createHash, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
  withMysqlConnection,
} from "./mysql";
import { isProduction } from "./production";

export type PaymentProvider = "zibal" | "snappay" | "zarinpal";

const KNOWN_PROVIDERS = new Set<PaymentProvider>([
  "zibal",
  "snappay",
  "zarinpal",
]);

/** Reuse the same gateway session within this window (same order + amount). */
export const PAYMENT_REF_REUSE_TTL_MS = 15 * 60 * 1000;

export type PaymentBinding = {
  provider: PaymentProvider;
  paymentRef: string;
  /** Gateway settle/ref id after successful verify (e.g. Zarinpal ref_id). */
  settleRef?: string;
  /** Order total in toman when the ref was created (reuse safety). */
  amountToman?: number;
  /** Redirect URL for providers that cannot reconstruct it (Snappay). */
  redirectUrl?: string;
  updatedAt?: string;
};

type MemoryRefs = Map<string, PaymentBinding>;

type MemoryLock = {
  promise: Promise<unknown>;
};

function memoryStore(): MemoryRefs {
  const g = globalThis as typeof globalThis & {
    __hajiasalPaymentRefs?: MemoryRefs;
  };
  if (!g.__hajiasalPaymentRefs) g.__hajiasalPaymentRefs = new Map();
  return g.__hajiasalPaymentRefs;
}

function memoryLocks(): Map<string, MemoryLock> {
  const g = globalThis as typeof globalThis & {
    __hajiasalPaymentLocks?: Map<string, MemoryLock>;
  };
  if (!g.__hajiasalPaymentLocks) g.__hajiasalPaymentLocks = new Map();
  return g.__hajiasalPaymentLocks;
}

function normalizeRef(ref: string): string {
  return ref.trim();
}

function safeEqual(a: string, b: string): boolean {
  try {
    const left = Buffer.from(a, "utf8");
    const right = Buffer.from(b, "utf8");
    if (left.length !== right.length) return false;
    return timingSafeEqual(left, right);
  } catch {
    return false;
  }
}

function rowToBinding(row: RowDataPacket): PaymentBinding | null {
  const provider = String(row.provider) as PaymentProvider;
  if (!KNOWN_PROVIDERS.has(provider)) return null;
  return {
    provider,
    paymentRef: String(row.payment_ref ?? ""),
    settleRef: row.settle_ref ? String(row.settle_ref) : undefined,
    amountToman:
      row.amount_toman != null && row.amount_toman !== ""
        ? Number(row.amount_toman)
        : undefined,
    redirectUrl: row.redirect_url ? String(row.redirect_url) : undefined,
    updatedAt: row.updated_at
      ? new Date(row.updated_at as string | Date).toISOString()
      : undefined,
  };
}

async function ensurePaymentRefsTable(): Promise<void> {
  await mysqlExecute(
    `CREATE TABLE IF NOT EXISTS order_payment_refs (
      order_id VARCHAR(64) PRIMARY KEY,
      provider VARCHAR(32) NOT NULL,
      payment_ref VARCHAR(255) NOT NULL,
      settle_ref VARCHAR(255) NULL,
      amount_toman INT NULL,
      redirect_url VARCHAR(512) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  for (const sql of [
    `ALTER TABLE order_payment_refs ADD COLUMN settle_ref VARCHAR(255) NULL`,
    `ALTER TABLE order_payment_refs ADD COLUMN amount_toman INT NULL`,
    `ALTER TABLE order_payment_refs ADD COLUMN redirect_url VARCHAR(512) NULL`,
  ]) {
    try {
      await mysqlExecute(sql);
    } catch {
      /* column already exists */
    }
  }
}

/**
 * Bind gateway authority/token to an order at payment-create time.
 * Verify callbacks must present the same ref (stops cross-order replay).
 * Production + MySQL: fail-closed if persist fails (multi-instance safety).
 * Local/dev: memory binding is enough when MySQL is down.
 */
export async function setOrderPaymentRef(
  orderId: string,
  provider: PaymentProvider,
  ref: string,
  options?: {
    amountToman?: number;
    redirectUrl?: string;
  },
): Promise<void> {
  const value = normalizeRef(ref);
  if (!orderId || !value) return;

  const nowIso = new Date().toISOString();
  const prev = memoryStore().get(orderId);
  memoryStore().set(orderId, {
    provider,
    paymentRef: value,
    settleRef: prev?.settleRef,
    amountToman: options?.amountToman ?? prev?.amountToman,
    redirectUrl: options?.redirectUrl ?? prev?.redirectUrl,
    updatedAt: nowIso,
  });

  if (!isMysqlUsable()) return;

  try {
    await ensurePaymentRefsTable();
    await mysqlExecute(
      `INSERT INTO order_payment_refs (order_id, provider, payment_ref, amount_toman, redirect_url)
       VALUES (?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         provider = VALUES(provider),
         payment_ref = VALUES(payment_ref),
         amount_toman = VALUES(amount_toman),
         redirect_url = VALUES(redirect_url)`,
      [
        orderId,
        provider,
        value,
        options?.amountToman ?? null,
        options?.redirectUrl ?? null,
      ],
    );
  } catch (error) {
    console.error(
      "[payment-refs] persist failed:",
      error instanceof Error ? error.message : error,
    );
    if (isProduction()) {
      memoryStore().delete(orderId);
      if (prev) memoryStore().set(orderId, prev);
      throw new Error("ثبت مرجع پرداخت ناموفق بود. دوباره تلاش کنید.");
    }
    // Keep memory binding for local single-process checkout.
  }
}

/** Persist settle/ref id after successful gateway verify. */
export async function setOrderSettleRef(
  orderId: string,
  settleRef: string,
): Promise<void> {
  const value = normalizeRef(settleRef);
  if (!orderId || !value) return;

  const prev = memoryStore().get(orderId);
  if (prev) {
    memoryStore().set(orderId, { ...prev, settleRef: value });
  } else {
    memoryStore().set(orderId, {
      provider: "zibal",
      paymentRef: "",
      settleRef: value,
    });
  }

  if (!isMysqlUsable()) return;
  try {
    await ensurePaymentRefsTable();
    await mysqlExecute(
      `UPDATE order_payment_refs SET settle_ref = ? WHERE order_id = ?`,
      [value, orderId],
    );
  } catch (error) {
    console.error(
      "[payment-refs] settle persist failed:",
      error instanceof Error ? error.message : error,
    );
  }
}

export async function getOrderPaymentBinding(
  orderId: string,
): Promise<PaymentBinding | null> {
  if (!orderId) return null;

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT provider, payment_ref, settle_ref, amount_toman, redirect_url, updated_at
         FROM order_payment_refs WHERE order_id = ? LIMIT 1`,
        [orderId],
      );
      if (row) {
        const binding = rowToBinding(row);
        if (binding) {
          memoryStore().set(orderId, binding);
          return binding;
        }
      }
    } catch {
      /* fall through to memory */
    }
  }

  return memoryStore().get(orderId) ?? null;
}

/**
 * Return an existing fresh payment session for the same order/provider/amount,
 * or null when a new gateway request is required.
 */
export async function getReusablePaymentBinding(
  orderId: string,
  provider: PaymentProvider,
  amountToman: number,
  ttlMs: number = PAYMENT_REF_REUSE_TTL_MS,
): Promise<PaymentBinding | null> {
  const binding = await getOrderPaymentBinding(orderId);
  if (!binding?.paymentRef) return null;
  if (binding.provider !== provider) return null;
  // Legacy rows without amount must not be reused (amount may have changed).
  if (
    binding.amountToman == null ||
    !Number.isFinite(binding.amountToman)
  ) {
    return null;
  }
  if (Math.round(binding.amountToman) !== Math.round(amountToman)) {
    return null;
  }
  const updatedMs = binding.updatedAt
    ? new Date(binding.updatedAt).getTime()
    : 0;
  if (!updatedMs || Number.isNaN(updatedMs)) return null;
  if (Date.now() - updatedMs > ttlMs) return null;
  return binding;
}

/**
 * Serialize payment-create per order across concurrent clicks.
 * Uses MySQL GET_LOCK when available; otherwise process-local lock chain.
 */
export async function withPaymentCreateLock<T>(
  orderId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const lockName = `pay_create_${orderId}`.slice(0, 64);

  if (isMysqlUsable()) {
    try {
      return await withMysqlConnection(async (conn) => {
        const [rows] = await conn.query<RowDataPacket[]>(
          `SELECT GET_LOCK(?, 10) AS locked`,
          [lockName],
        );
        const locked = Number(
          Array.isArray(rows) ? rows[0]?.locked : 0,
        );
        if (locked !== 1) {
          throw new Error("PAYMENT_CREATE_IN_FLIGHT");
        }
        try {
          return await fn();
        } finally {
          await conn
            .query(`SELECT RELEASE_LOCK(?) AS released`, [lockName])
            .catch(() => null);
        }
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "PAYMENT_CREATE_IN_FLIGHT"
      ) {
        throw error;
      }
      /* fall through to memory lock if MySQL is unreachable */
    }
  }

  const locks = memoryLocks();
  const prev = locks.get(orderId)?.promise ?? Promise.resolve();
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const next = prev.then(() => gate);
  locks.set(orderId, { promise: next });
  await prev.catch(() => undefined);
  try {
    return await fn();
  } finally {
    release();
    if (locks.get(orderId)?.promise === next) {
      locks.delete(orderId);
    }
  }
}

/**
 * Fail-closed: verify callbacks must present the same ref set at payment-create.
 * Returns true only when a stored binding exists and matches.
 */
export async function assertOrderPaymentRef(
  orderId: string,
  provider: PaymentProvider,
  ref: string,
): Promise<boolean> {
  const expected = normalizeRef(ref);
  if (!orderId || !expected) return false;

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT provider, payment_ref FROM order_payment_refs WHERE order_id = ? LIMIT 1`,
        [orderId],
      );
      if (row) {
        return (
          String(row.provider) === provider &&
          safeEqual(String(row.payment_ref), expected)
        );
      }
    } catch {
      /* fall through to memory */
    }
  }

  const mem = memoryStore().get(orderId);
  if (!mem || !mem.paymentRef) {
    return false;
  }
  if (mem.provider !== provider) return false;
  return safeEqual(mem.paymentRef, expected);
}

/** @internal */
export function __resetPaymentRefsForTests(): void {
  memoryStore().clear();
  memoryLocks().clear();
}

/** Hash helper kept for potential signed-state callbacks. */
export function hashPaymentRef(ref: string): string {
  return createHash("sha256").update(ref).digest("hex");
}
