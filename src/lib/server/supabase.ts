/**
 * Database admin access — MySQL on host (cPanel).
 * Kept filename for import stability; implementation is mysql2.
 */
export {
  isMysqlConfigured,
  isSupabaseConfigured,
  getMysqlPool,
  getSupabaseAdmin,
  newId,
  asJson,
  parseJsonField,
  toIso,
  toBool,
  mysqlQuery,
  mysqlQueryOne,
  mysqlExecute,
  withMysqlTransaction,
  isDuplicateKeyError,
} from "./mysql";
