import { createHash, timingSafeEqual } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
} from "./mysql";
import { isProduction } from "./production";

export type PaymentProvider = "zibal" | "snappay" | "zarinpal";

const KNOWN_PROVIDERS = new Set<PaymentProvider>([
  "zibal",
  "snappay",
  "zarinpal",
]);

export type PaymentBinding = {
  provider: PaymentProvider;
  paymentRef: string;
  /** Gateway settle/ref id after successful verify (e.g. Zarinpal ref_id). */
  settleRef?: string;
};

type MemoryRefs = Map<string, PaymentBinding>;

function memoryStore(): MemoryRefs {
  const g = globalThis as typeof globalThis & {
    __hajiasalPaymentRefs?: MemoryRefs;
  };
  if (!g.__hajiasalPaymentRefs) g.__hajiasalPaymentRefs = new Map();
  return g.__hajiasalPaymentRefs;
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

async function ensurePaymentRefsTable(): Promise<void> {
  await mysqlExecute(
    `CREATE TABLE IF NOT EXISTS order_payment_refs (
      order_id VARCHAR(64) PRIMARY KEY,
      provider VARCHAR(32) NOT NULL,
      payment_ref VARCHAR(255) NOT NULL,
      settle_ref VARCHAR(255) NULL,
      created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
      updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  );
  try {
    await mysqlExecute(
      `ALTER TABLE order_payment_refs ADD COLUMN settle_ref VARCHAR(255) NULL`,
    );
  } catch {
    /* column already exists */
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
): Promise<void> {
  const value = normalizeRef(ref);
  if (!orderId || !value) return;

  const prev = memoryStore().get(orderId);
  memoryStore().set(orderId, {
    provider,
    paymentRef: value,
    settleRef: prev?.settleRef,
  });

  if (!isMysqlUsable()) return;

  try {
    await ensurePaymentRefsTable();
    await mysqlExecute(
      `INSERT INTO order_payment_refs (order_id, provider, payment_ref)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE provider = VALUES(provider), payment_ref = VALUES(payment_ref)`,
      [orderId, provider, value],
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
        `SELECT provider, payment_ref, settle_ref FROM order_payment_refs WHERE order_id = ? LIMIT 1`,
        [orderId],
      );
      if (row) {
        const provider = String(row.provider) as PaymentProvider;
        if (!KNOWN_PROVIDERS.has(provider)) return null;
        return {
          provider,
          paymentRef: String(row.payment_ref ?? ""),
          settleRef: row.settle_ref ? String(row.settle_ref) : undefined,
        };
      }
    } catch {
      /* fall through to memory */
    }
  }

  return memoryStore().get(orderId) ?? null;
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
}

/** Hash helper kept for potential signed-state callbacks. */
export function hashPaymentRef(ref: string): string {
  return createHash("sha256").update(ref).digest("hex");
}
