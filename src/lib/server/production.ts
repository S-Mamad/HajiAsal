import { isMysqlConfigured } from "./mysql";

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function requireSupabaseInProduction(): void {
  if (isProduction() && !isMysqlConfigured()) {
    throw new Error(
      "MySQL is required in production. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.",
    );
  }
}

export function requireMysqlInProduction(): void {
  requireSupabaseInProduction();
}

export function canUseFilesystemPersistence(): boolean {
  return !isProduction();
}

/** Local/dev/tests may fall through to JSON/memory when MySQL fails; production must not. */
export function allowTicketMysqlFallthrough(): boolean {
  return !isProduction();
}

export function isMysqlDuplicateKey(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  return (
    code === "ER_DUP_ENTRY" ||
    /duplicate|er_dup_entry/i.test(msg)
  );
}
