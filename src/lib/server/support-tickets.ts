import type { RowDataPacket } from "mysql2/promise";
import { randomUUID } from "crypto";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
  newId,
  parseJsonField,
} from "./mysql";
import { readJsonFile, writeJsonFile } from "./db";
import {
  allowTicketMysqlFallthrough,
  canUseFilesystemPersistence,
  isMysqlDuplicateKey,
} from "./production";
import type { TicketMessage, TicketPriority } from "@/lib/tickets/types";
import { isTicketClosed, statusAfterSenderReply } from "@/lib/tickets/types";

export interface SupportTicketRecord {
  id: string;
  subject: string;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  lockedBy?: string | null;
  lockedAt?: string | null;
  department?: string | null;
  csatScore?: number | null;
  csatAt?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportTicketMessageRecord extends TicketMessage {
  ticketId: string;
}

type FsTicketBundle = SupportTicketRecord & {
  messages?: SupportTicketMessageRecord[];
};

const memoryTickets: FsTicketBundle[] = [];

async function fsListTickets(): Promise<FsTicketBundle[]> {
  return readJsonFile<FsTicketBundle[]>("support-tickets.json", []);
}

async function fsSaveTickets(data: FsTicketBundle[]): Promise<void> {
  await writeJsonFile("support-tickets.json", data);
}

function mapTicketRow(r: RowDataPacket): SupportTicketRecord {
  return {
    id: String(r.id),
    subject: String(r.subject),
    customerId: r.customer_id ? String(r.customer_id) : null,
    customerName: r.customer_name ? String(r.customer_name) : null,
    customerPhone: r.customer_phone ? String(r.customer_phone) : null,
    status: String(r.status ?? "open"),
    priority: String(r.priority ?? "normal"),
    assignedTo: r.assigned_to ? String(r.assigned_to) : null,
    lockedBy: r.locked_by ? String(r.locked_by) : null,
    lockedAt: r.locked_at ? toIso(r.locked_at) : null,
    department: r.department ? String(r.department) : "general",
    csatScore: r.csat_score != null ? Number(r.csat_score) : null,
    csatAt: r.csat_at ? toIso(r.csat_at) : null,
    meta: parseJsonField<Record<string, unknown> | null>(r.meta, null),
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapMessageRow(r: RowDataPacket): SupportTicketMessageRecord {
  return {
    id: String(r.id),
    ticketId: String(r.ticket_id),
    senderType: String(r.sender_type),
    senderId: r.sender_id ? String(r.sender_id) : null,
    body: String(r.body ?? ""),
    attachmentUrl: r.attachment_url ? String(r.attachment_url) : null,
    attachmentName: r.attachment_name ? String(r.attachment_name) : null,
    attachmentMime: r.attachment_mime ? String(r.attachment_mime) : null,
    clientMessageId: r.client_message_id ? String(r.client_message_id) : null,
    replyToId: r.reply_to_id ? String(r.reply_to_id) : null,
    isInternal: Boolean(Number(r.is_internal ?? 0)),
    editedAt: r.edited_at ? toIso(r.edited_at) : null,
    deletedAt: r.deleted_at ? toIso(r.deleted_at) : null,
    createdAt: toIso(r.created_at),
  };
}

export async function listSupportTickets(): Promise<SupportTicketRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        "SELECT * FROM support_tickets ORDER BY updated_at DESC",
      );
      return rows.map(mapTicketRow);
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[support-tickets] listSupportTickets mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    return list
      .map(({ messages: _m, ...t }) => t)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }
  return memoryTickets
    .map(({ messages: _m, ...t }) => t)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function listSupportTicketsByCustomer(
  customerId: string,
): Promise<SupportTicketRecord[]> {
  const all = await listSupportTickets();
  return all.filter((t) => t.customerId === customerId);
}

export async function getSupportTicket(
  id: string,
): Promise<SupportTicketRecord | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        "SELECT * FROM support_tickets WHERE id = ? LIMIT 1",
        [id],
      );
      if (row) return mapTicketRow(row);
      return null;
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[support-tickets] getSupportTicket mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    const found = list.find((t) => t.id === id);
    if (found) {
      const { messages: _m, ...ticket } = found;
      return ticket;
    }
    return null;
  }
  const mem = memoryTickets.find((t) => t.id === id);
  if (!mem) return null;
  const { messages: _m, ...ticket } = mem;
  return ticket;
}

export async function upsertSupportTicket(
  input: Partial<SupportTicketRecord> & { subject: string },
): Promise<SupportTicketRecord> {
  const now = new Date().toISOString();
  const existing = input.id ? await getSupportTicket(input.id) : null;
  const record: SupportTicketRecord = {
    id: input.id ?? newId(),
    subject: input.subject,
    customerId:
      input.customerId !== undefined
        ? input.customerId
        : (existing?.customerId ?? null),
    customerName:
      input.customerName !== undefined
        ? input.customerName
        : (existing?.customerName ?? null),
    customerPhone:
      input.customerPhone !== undefined
        ? input.customerPhone
        : (existing?.customerPhone ?? null),
    status: input.status ?? existing?.status ?? "open",
    priority: input.priority ?? existing?.priority ?? "normal",
    assignedTo:
      input.assignedTo !== undefined
        ? input.assignedTo
        : (existing?.assignedTo ?? null),
    department:
      input.department !== undefined
        ? input.department
        : (existing?.department ?? "general"),
    lockedBy:
      input.lockedBy !== undefined ? input.lockedBy : (existing?.lockedBy ?? null),
    lockedAt:
      input.lockedAt !== undefined ? input.lockedAt : (existing?.lockedAt ?? null),
    csatScore:
      input.csatScore !== undefined
        ? input.csatScore
        : (existing?.csatScore ?? null),
    csatAt:
      input.csatScore !== undefined && input.csatScore !== existing?.csatScore
        ? input.csatScore != null
          ? now
          : null
        : (existing?.csatAt ?? null),
    meta: input.meta !== undefined ? input.meta : (existing?.meta ?? null),
    createdAt: existing?.createdAt ?? input.createdAt ?? now,
    updatedAt: now,
  };

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO support_tickets
          (id, subject, customer_id, customer_name, customer_phone, status, priority,
           assigned_to, department, locked_by, locked_at, csat_score, csat_at, meta, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           subject=VALUES(subject),
           customer_id=VALUES(customer_id),
           customer_name=VALUES(customer_name),
           customer_phone=VALUES(customer_phone),
           status=VALUES(status),
           priority=VALUES(priority),
           assigned_to=VALUES(assigned_to),
           department=VALUES(department),
           locked_by=VALUES(locked_by),
           locked_at=VALUES(locked_at),
           csat_score=VALUES(csat_score),
           csat_at=VALUES(csat_at),
           meta=VALUES(meta),
           updated_at=VALUES(updated_at)`,
        [
          record.id,
          record.subject,
          record.customerId,
          record.customerName,
          record.customerPhone,
          record.status,
          record.priority,
          record.assignedTo,
          record.department,
          record.lockedBy,
          record.lockedAt,
          record.csatScore,
          record.csatAt,
          record.meta ? JSON.stringify(record.meta) : null,
          record.createdAt,
          record.updatedAt,
        ],
      );
      return record;
    } catch (error) {
      console.error(
        "[support-tickets] upsertSupportTicket mysql failed:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
    }
  }

  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    const idx = list.findIndex((t) => t.id === record.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...record };
    } else {
      list.push({ ...record, messages: [] });
    }
    await fsSaveTickets(list);
    return record;
  }

  const idx = memoryTickets.findIndex((t) => t.id === record.id);
  if (idx >= 0) {
    memoryTickets[idx] = { ...memoryTickets[idx], ...record };
  } else {
    memoryTickets.unshift({ ...record, messages: [] });
  }
  return record;
}

export async function listSupportTicketMessages(
  ticketId: string,
): Promise<SupportTicketMessageRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
        [ticketId],
      );
      return rows.map(mapMessageRow);
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[support-tickets] listSupportTicketMessages mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    const found = list.find((t) => t.id === ticketId);
    return found?.messages ?? [];
  }
  return memoryTickets.find((t) => t.id === ticketId)?.messages ?? [];
}

export async function addSupportTicketMessage(input: {
  ticketId: string;
  senderType: "customer" | "admin" | "system";
  senderId?: string | null;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  clientMessageId?: string | null;
  replyToId?: string | null;
  isInternal?: boolean;
  nextStatus?: string;
}): Promise<SupportTicketMessageRecord> {
  const ticket = await getSupportTicket(input.ticketId);
  if (!ticket) {
    throw new Error("TICKET_NOT_FOUND");
  }
  if (
    isTicketClosed(ticket.status) &&
    input.senderType !== "system"
  ) {
    throw new Error("TICKET_CLOSED");
  }

  const existing = await listSupportTicketMessages(input.ticketId);
  if (input.clientMessageId) {
    const dup = existing.find((m) => m.clientMessageId === input.clientMessageId);
    if (dup) return dup;
  }

  const { prepareOutboundBody } = await import("./ticket-runtime");
  const prepared =
    input.senderType === "system"
      ? { body: input.body, departmentHint: ticket.department ?? "general" }
      : prepareOutboundBody(input.body);

  const now = new Date().toISOString();
  const message: SupportTicketMessageRecord = {
    id: randomUUID(),
    ticketId: input.ticketId,
    senderType: input.senderType,
    senderId: input.senderId ?? null,
    body: prepared.body,
    attachmentUrl: input.attachmentUrl ?? null,
    attachmentName: input.attachmentName ?? null,
    attachmentMime: input.attachmentMime ?? null,
    clientMessageId: input.clientMessageId ?? null,
    replyToId: input.replyToId ?? null,
    isInternal: Boolean(input.isInternal),
    createdAt: now,
    delivery: "sent",
  };
  const nextStatus =
    input.isInternal
      ? ticket.status
      : (input.nextStatus ??
        statusAfterSenderReply(
          input.senderType === "system" ? "system" : input.senderType,
        ));

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO ticket_messages
          (id, ticket_id, sender_type, sender_id, body, attachment_url, attachment_name, attachment_mime,
           client_message_id, reply_to_id, is_internal, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          message.ticketId,
          message.senderType,
          message.senderId,
          message.body,
          message.attachmentUrl,
          message.attachmentName,
          message.attachmentMime,
          message.clientMessageId,
          message.replyToId,
          message.isInternal ? 1 : 0,
          message.createdAt,
        ],
      );
      await mysqlExecute(
        `UPDATE support_tickets SET status = ?, department = COALESCE(?, department), updated_at = ? WHERE id = ?`,
        [nextStatus, prepared.departmentHint, now, input.ticketId],
      );
      return message;
    } catch (error) {
      if (isMysqlDuplicateKey(error) && input.clientMessageId) {
        const again = await listSupportTicketMessages(input.ticketId);
        const dup = again.find(
          (m) => m.clientMessageId === input.clientMessageId,
        );
        if (dup) return dup;
      }
      console.error(
        "[support-tickets] addSupportTicketMessage mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
    }
  }

  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    let idx = list.findIndex((t) => t.id === input.ticketId);
    if (idx < 0) {
      list.push({ ...ticket, messages: existing });
      idx = list.length - 1;
    }
    const messages = list[idx].messages ?? [];
    messages.push(message);
    list[idx] = {
      ...list[idx],
      messages,
      status: nextStatus,
      department: prepared.departmentHint,
      updatedAt: now,
    };
    await fsSaveTickets(list);
    return message;
  }

  let memIdx = memoryTickets.findIndex((t) => t.id === input.ticketId);
  if (memIdx < 0) {
    memoryTickets.unshift({ ...ticket, messages: existing });
    memIdx = 0;
  }
  const messages = memoryTickets[memIdx].messages ?? [];
  messages.push(message);
  memoryTickets[memIdx] = {
    ...memoryTickets[memIdx],
    messages,
    status: nextStatus,
    department: prepared.departmentHint,
    updatedAt: now,
  };
  return message;
}

export async function mutateSupportMessage(input: {
  ticketId: string;
  messageId: string;
  actorId: string;
  mode: "edit" | "delete";
  body?: string;
}): Promise<SupportTicketMessageRecord> {
  const messages = await listSupportTicketMessages(input.ticketId);
  const msg = messages.find((m) => m.id === input.messageId);
  if (!msg) throw new Error("MESSAGE_NOT_FOUND");
  if (msg.senderId && msg.senderId !== input.actorId && msg.senderType !== "admin") {
    throw new Error("FORBIDDEN");
  }
  if (input.mode === "delete") {
    msg.deletedAt = new Date().toISOString();
    msg.body = "";
  } else {
    const { prepareOutboundBody } = await import("./ticket-runtime");
    msg.body = prepareOutboundBody(input.body ?? "").body;
    msg.editedAt = new Date().toISOString();
  }

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `UPDATE ticket_messages
         SET body = ?, edited_at = ?, deleted_at = ?
         WHERE id = ? AND ticket_id = ?`,
        [
          msg.body,
          msg.editedAt ?? null,
          msg.deletedAt ?? null,
          input.messageId,
          input.ticketId,
        ],
      );
      return msg;
    } catch (error) {
      console.error(
        "[support-tickets] mutateSupportMessage mysql failed:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
    }
  }

  if (canUseFilesystemPersistence()) {
    const list = await fsListTickets();
    const idx = list.findIndex((t) => t.id === input.ticketId);
    if (idx >= 0) {
      list[idx].messages = messages;
      await fsSaveTickets(list);
    }
  } else {
    const memIdx = memoryTickets.findIndex((t) => t.id === input.ticketId);
    if (memIdx >= 0) memoryTickets[memIdx].messages = messages;
  }
  return msg;
}

export async function searchSupportMessages(q: string, limit = 50) {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const tickets = await listSupportTickets();
  const hits: Array<{
    ticketId: string;
    subject: string;
    messageId: string;
    snippet: string;
  }> = [];
  for (const t of tickets) {
    const messages = await listSupportTicketMessages(t.id);
    for (const m of messages) {
      if (m.deletedAt || m.isInternal) continue;
      if (m.body.toLowerCase().includes(needle) || t.subject.toLowerCase().includes(needle)) {
        hits.push({
          ticketId: t.id,
          subject: t.subject,
          messageId: m.id,
          snippet: m.body.slice(0, 160),
        });
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

export async function autoCloseStaleSupportTickets(): Promise<number> {
  const { shouldAutoClose, buildSystemMessage } = await import("./ticket-runtime");
  const tickets = await listSupportTickets();
  let closed = 0;
  for (const t of tickets) {
    if (!shouldAutoClose(t)) continue;
    await upsertSupportTicket({ ...t, status: "closed" });
    const sys = buildSystemMessage({
      body: "تیکت به‌خاطر عدم پاسخ کاربر به‌صورت خودکار بسته شد.",
      ticketId: t.id,
    });
    await addSupportTicketMessage({
      ticketId: t.id,
      senderType: "system",
      body: sys.body,
      nextStatus: "closed",
    }).catch(() => undefined);
    closed += 1;
  }
  return closed;
}

export async function createCustomerTicket(input: {
  customerId: string;
  customerName?: string | null;
  customerPhone?: string | null;
  subject: string;
  body: string;
  priority?: TicketPriority;
  meta?: Record<string, unknown> | null;
}): Promise<{ ticket: SupportTicketRecord; message: SupportTicketMessageRecord }> {
  const { prepareOutboundBody, isAnyOperatorOnline, buildSystemMessage } =
    await import("./ticket-runtime");
  const prepared = prepareOutboundBody(input.body);
  const online = isAnyOperatorOnline();

  const ticket = await upsertSupportTicket({
    subject: input.subject,
    customerId: input.customerId,
    customerName: input.customerName ?? null,
    customerPhone: input.customerPhone ?? null,
    status: "open",
    priority: input.priority ?? "normal",
    department: prepared.departmentHint,
    meta: input.meta ?? null,
  });

  const message = await addSupportTicketMessage({
    ticketId: ticket.id,
    senderType: "customer",
    senderId: input.customerId,
    body: prepared.body,
    nextStatus: "waiting",
  });

  if (!online) {
    await addSupportTicketMessage({
      ticketId: ticket.id,
      senderType: "system",
      body: "اپراتور آنلاین نیست. پیام شما به‌صورت تیکت ثبت شد و پاسخ در پنل حساب کاربری شما نمایش داده می‌شود.",
      nextStatus: "waiting",
    });
  } else {
    await addSupportTicketMessage({
      ticketId: ticket.id,
      senderType: "system",
      body: "به پشتیبانی زنده متصل شدید. لطفاً منتظر پاسخ اپراتور بمانید.",
      nextStatus: "waiting",
    });
  }

  void buildSystemMessage;
  return { ticket: { ...ticket, status: "waiting", department: prepared.departmentHint }, message };
}

/** Test helper — clears in-memory tickets. */
export function __resetSupportTicketsMemoryForTests(): void {
  memoryTickets.length = 0;
}
