import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { randomUUID } from "crypto";

let pool: Pool | null = null;

/** After connection failures, skip MySQL briefly so auth can use local fallback. */
let mysqlCircuitOpenUntil = 0;
const CIRCUIT_COOLDOWN_MS = Number(
  process.env.MYSQL_CIRCUIT_COOLDOWN_MS || 30_000,
);

export function isMysqlConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_HOST &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_DATABASE,
  );
}

/** Configured AND not in open circuit (recent hard failure). */
export function isMysqlUsable(): boolean {
  return isMysqlConfigured() && Date.now() >= mysqlCircuitOpenUntil;
}

function openMysqlCircuit(error: unknown): void {
  mysqlCircuitOpenUntil = Date.now() + CIRCUIT_COOLDOWN_MS;
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    `[mysql] circuit open for ${CIRCUIT_COOLDOWN_MS}ms:`,
    message,
  );
}

function isConnectionError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string; errno?: number };
  return (
    err.code === "ECONNREFUSED" ||
    err.code === "ETIMEDOUT" ||
    err.code === "ENOTFOUND" ||
    err.code === "ECONNRESET" ||
    err.code === "PROTOCOL_CONNECTION_LOST" ||
    err.code === "ER_ACCESS_DENIED_ERROR" ||
    err.errno === -4078
  );
}

async function withMysqlCircuit<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  if (!isMysqlUsable()) {
    throw new Error("MySQL temporarily unavailable");
  }
  const p = getMysqlPool();
  if (!p) throw new Error("MySQL is not configured");
  try {
    return await fn(p);
  } catch (error) {
    if (isConnectionError(error)) {
      openMysqlCircuit(error);
      // Drop broken pool so the next successful window recreates connections.
      try {
        await p.end();
      } catch {
        /* ignore */
      }
      pool = null;
    }
    throw error;
  }
}

/** @deprecated use isMysqlConfigured — kept so old call sites compile during migration */
export function isSupabaseConfigured(): boolean {
  return isMysqlConfigured();
}

export function getMysqlPool(): Pool | null {
  if (!isMysqlConfigured()) return null;
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.MYSQL_HOST!,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: process.env.MYSQL_USER!,
      password: process.env.MYSQL_PASSWORD ?? "",
      database: process.env.MYSQL_DATABASE!,
      waitForConnections: true,
      connectionLimit: Number(process.env.MYSQL_POOL_SIZE || 10),
      // SSG / burst traffic can queue many queries; keep headroom above pool size.
      queueLimit: Number(process.env.MYSQL_QUEUE_LIMIT || 50),
      connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 5000),
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
      timezone: "Z",
      dateStrings: false,
      charset: "utf8mb4",
    });
  }
  return pool;
}

/** Alias used by existing call sites that checked for a DB admin client */
export function getSupabaseAdmin(): Pool | null {
  return getMysqlPool();
}

export function newId(): string {
  return randomUUID();
}

export function asJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

export function parseJsonField<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "object") return value as T;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return fallback;
}

export function toIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  return new Date().toISOString();
}

export function toBool(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") return value === "1" || value.toLowerCase() === "true";
  return Boolean(value);
}

export async function mysqlQuery<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  return withMysqlCircuit(async (p) => {
    const [rows] = await p.query<T[]>(sql, params as never[]);
    return rows;
  });
}

export async function mysqlQueryOne<T extends RowDataPacket>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const rows = await mysqlQuery<T>(sql, params);
  return rows[0] ?? null;
}

export async function mysqlExecute(
  sql: string,
  params: unknown[] = [],
): Promise<ResultSetHeader> {
  return withMysqlCircuit(async (p) => {
    const [result] = await p.execute<ResultSetHeader>(sql, params as never[]);
    return result;
  });
}

export async function withMysqlTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  return withMysqlCircuit(async (p) => {
    const conn = await p.getConnection();
    try {
      await conn.beginTransaction();
      const out = await fn(conn);
      await conn.commit();
      return out;
    } catch (err) {
      await conn.rollback();
      throw err;
    } finally {
      conn.release();
    }
  });
}

export function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "errno" in err &&
      (err as { errno: number }).errno === 1062,
  );
}
