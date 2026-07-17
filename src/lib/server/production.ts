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
