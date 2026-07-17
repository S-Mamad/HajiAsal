import { asJson, isMysqlConfigured, mysqlExecute, newId } from "./mysql";

export async function logAdminAction(input: {
  action: string;
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
}): Promise<void> {
  if (!isMysqlConfigured()) return;

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
