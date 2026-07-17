import mysql, {
  type Pool,
  type PoolConnection,
  type ResultSetHeader,
  type RowDataPacket,
} from "mysql2/promise";
import { randomUUID } from "crypto";

let pool: Pool | null = null;

export function isMysqlConfigured(): boolean {
  return Boolean(
    process.env.MYSQL_HOST &&
      process.env.MYSQL_USER &&
      process.env.MYSQL_DATABASE,
  );
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
  const p = getMysqlPool();
  if (!p) throw new Error("MySQL is not configured");
  const [rows] = await p.query<T[]>(sql, params as never[]);
  return rows;
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
  const p = getMysqlPool();
  if (!p) throw new Error("MySQL is not configured");
  const [result] = await p.execute<ResultSetHeader>(sql, params as never[]);
  return result;
}

export async function withMysqlTransaction<T>(
  fn: (conn: PoolConnection) => Promise<T>,
): Promise<T> {
  const p = getMysqlPool();
  if (!p) throw new Error("MySQL is not configured");
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
}

export function isDuplicateKeyError(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "errno" in err &&
      (err as { errno: number }).errno === 1062,
  );
}
