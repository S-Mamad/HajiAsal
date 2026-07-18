import { asJson, isMysqlConfigured, mysqlExecute, newId } from "./mysql";

export async function logAdminAction(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  adminUserId?: string | null;
  ipAddress?: string | null;
}): Promise<void> {
  if (!isMysqlConfigured()) return;

  try {
    await mysqlExecute(
      `INSERT INTO admin_audit_log (id, action, entity_type, entity_id, payload, admin_user_id, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        newId(),
        input.action,
        input.entityType ?? null,
        input.entityId ?? null,
        input.payload ? asJson(input.payload) : null,
        input.adminUserId ?? null,
        input.ipAddress ?? null,
      ],
    );
  } catch {
    try {
      await mysqlExecute(
        `INSERT INTO admin_audit_log (id, action, entity_type, entity_id, payload)
         VALUES (?, ?, ?, ?, ?)`,
        [
          newId(),
          input.action,
          input.entityType ?? null,
          input.entityId ?? null,
          input.payload ? asJson(input.payload) : null,
        ],
      );
    } catch (error) {
      console.error(
        "[audit-log] insert failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
}
