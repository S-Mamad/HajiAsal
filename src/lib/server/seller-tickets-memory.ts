import { randomUUID } from "node:crypto";
import type { RowDataPacket } from "mysql2/promise";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  mysqlQueryOne,
  toIso,
} from "./mysql";
import { readJsonFile, writeJsonFile } from "./db";
import {
  allowTicketMysqlFallthrough,
  canUseFilesystemPersistence,
  isMysqlDuplicateKey,
} from "./production";
import type { TicketMessage } from "@/lib/tickets/types";
import { isTicketClosed, statusAfterSenderReply } from "@/lib/tickets/types";
import { maskSensitiveText } from "@/lib/tickets/types";
import { sanitizeTicketAttachmentUrl } from "@/lib/tickets/attachment-url";

export type MemoryTicketMessage = TicketMessage;

export type MemoryTicket = {
  id: string;
  sellerId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  messages: MemoryTicketMessage[];
};

/** Shared in-memory cache; filesystem is source of truth in local/dev without MySQL. */
export const memorySellerTickets: MemoryTicket[] = [];

export async function loadSellerTicketsFs(): Promise<MemoryTicket[]> {
  if (!canUseFilesystemPersistence()) return memorySellerTickets;
  const list = await readJsonFile<MemoryTicket[]>("seller-tickets.json", []);
  const byId = new Map<string, MemoryTicket>();
  for (const t of list) byId.set(t.id, t);
  // Keep in-memory tickets that may not have flushed to disk yet.
  for (const t of memorySellerTickets) {
    const prev = byId.get(t.id);
    if (!prev || t.updatedAt >= prev.updatedAt) byId.set(t.id, t);
  }
  memorySellerTickets.length = 0;
  memorySellerTickets.push(
    ...[...byId.values()].sort((a, b) =>
      b.updatedAt.localeCompare(a.updatedAt),
    ),
  );
  return memorySellerTickets;
}

/** Ensure a MySQL-sourced ticket exists in local memory/FS before fallthrough writes. */
function ensureMemoryTicketFromRecord(ticket: SellerTicketRecord): void {
  if (findMemoryTicketById(ticket.id)) return;
  memorySellerTickets.unshift({
    ...ticket,
    messages: [],
  });
  void saveSellerTicketsFs();
}

async function saveSellerTicketsFs(): Promise<void> {
  if (!canUseFilesystemPersistence()) return;
  await writeJsonFile("seller-tickets.json", memorySellerTickets);
}

export function findMemoryTicket(
  id: string,
  sellerId: string,
): MemoryTicket | undefined {
  return memorySellerTickets.find((t) => t.id === id && t.sellerId === sellerId);
}

export function findMemoryTicketById(id: string): MemoryTicket | undefined {
  return memorySellerTickets.find((t) => t.id === id);
}

export function listMemoryTickets(sellerId: string): MemoryTicket[] {
  return memorySellerTickets.filter((t) => t.sellerId === sellerId);
}

export function listAllMemoryTickets(): MemoryTicket[] {
  return [...memorySellerTickets].sort((a, b) =>
    b.updatedAt.localeCompare(a.updatedAt),
  );
}

export async function createMemoryTicket(input: {
  sellerId: string;
  subject: string;
  category: string;
  priority: string;
  body: string;
}): Promise<MemoryTicket> {
  const now = new Date().toISOString();
  const ticket: MemoryTicket = {
    id: randomUUID(),
    sellerId: input.sellerId,
    subject: input.subject,
    category: input.category,
    priority: input.priority,
    status: "open",
    createdAt: now,
    updatedAt: now,
    messages: [
      {
        id: randomUUID(),
        senderType: "seller",
        body: maskSensitiveText(input.body.trim()),
        attachmentUrl: null,
        createdAt: now,
      },
    ],
  };
  memorySellerTickets.unshift(ticket);
  await saveSellerTicketsFs();
  return ticket;
}

export function replyMemoryTicket(
  id: string,
  sellerId: string,
  body: string,
  attachmentUrl?: string | null,
): MemoryTicketMessage | null {
  const ticket = findMemoryTicket(id, sellerId);
  if (!ticket) return null;
  if (isTicketClosed(ticket.status)) return null;
  const now = new Date().toISOString();
  const message: MemoryTicketMessage = {
    id: randomUUID(),
    senderType: "seller",
    body,
    attachmentUrl: attachmentUrl ?? null,
    createdAt: now,
  };
  ticket.messages.push(message);
  ticket.status = statusAfterSenderReply("seller");
  ticket.updatedAt = now;
  void saveSellerTicketsFs();
  return message;
}

export function adminReplyMemoryTicket(
  id: string,
  body: string,
  attachmentUrl?: string | null,
  adminId?: string | null,
): MemoryTicketMessage | null {
  const ticket = findMemoryTicketById(id);
  if (!ticket) return null;
  if (isTicketClosed(ticket.status)) return null;
  const now = new Date().toISOString();
  const message: MemoryTicketMessage = {
    id: randomUUID(),
    senderType: "admin",
    senderId: adminId ?? null,
    body,
    attachmentUrl: attachmentUrl ?? null,
    createdAt: now,
  };
  ticket.messages.push(message);
  ticket.status = statusAfterSenderReply("admin");
  ticket.updatedAt = now;
  void saveSellerTicketsFs();
  return message;
}

export function updateMemoryTicketMeta(
  id: string,
  patch: { status?: string; priority?: string },
): MemoryTicket | null {
  const ticket = findMemoryTicketById(id);
  if (!ticket) return null;
  if (patch.status !== undefined) ticket.status = patch.status;
  if (patch.priority !== undefined) ticket.priority = patch.priority;
  ticket.updatedAt = new Date().toISOString();
  void saveSellerTicketsFs();
  return ticket;
}

export function __resetSellerTicketsMemoryForTests(): void {
  memorySellerTickets.length = 0;
}

export type SellerTicketRecord = {
  id: string;
  sellerId: string;
  subject: string;
  category: string;
  priority: string;
  status: string;
  lockedBy?: string | null;
  lockedAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapSellerTicket(r: RowDataPacket): SellerTicketRecord {
  return {
    id: String(r.id),
    sellerId: String(r.seller_id),
    subject: String(r.subject),
    category: String(r.category ?? "general"),
    priority: String(r.priority ?? "normal"),
    status: String(r.status ?? "open"),
    lockedBy: r.locked_by ? String(r.locked_by) : null,
    lockedAt: r.locked_at ? toIso(r.locked_at) : null,
    createdAt: toIso(r.created_at),
    updatedAt: toIso(r.updated_at),
  };
}

function mapSellerMessage(r: RowDataPacket): TicketMessage {
  return {
    id: String(r.id),
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

export async function listAllSellerTickets(): Promise<SellerTicketRecord[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_tickets ORDER BY updated_at DESC`,
      );
      return rows.map(mapSellerTicket);
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[seller-tickets] listAllSellerTickets mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  await loadSellerTicketsFs();
  return listAllMemoryTickets().map(
    ({ messages: _m, ...t }) => t,
  );
}

export async function getSellerTicketById(
  id: string,
): Promise<SellerTicketRecord | null> {
  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQueryOne<RowDataPacket>(
        `SELECT * FROM seller_tickets WHERE id = ? LIMIT 1`,
        [id],
      );
      if (row) return mapSellerTicket(row);
      return null;
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[seller-tickets] getSellerTicketById mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  await loadSellerTicketsFs();
  const mem = findMemoryTicketById(id);
  if (!mem) return null;
  const { messages: _m, ...ticket } = mem;
  return ticket;
}

export async function listSellerTicketMessages(
  ticketId: string,
): Promise<TicketMessage[]> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_ticket_messages WHERE ticket_id = ? ORDER BY created_at ASC`,
        [ticketId],
      );
      return rows.map(mapSellerMessage);
    } catch (error) {
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
      console.error(
        "[seller-tickets] listSellerTicketMessages mysql failed:",
        error instanceof Error ? error.message : error,
      );
    }
  }
  await loadSellerTicketsFs();
  return findMemoryTicketById(ticketId)?.messages ?? [];
}

export async function addSellerTicketMessage(input: {
  ticketId: string;
  senderType: "seller" | "admin";
  senderId?: string | null;
  body: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentMime?: string | null;
  clientMessageId?: string | null;
  replyToId?: string | null;
  /** When sender is seller, ownership check */
  sellerId?: string;
}): Promise<TicketMessage> {
  const ticket = await getSellerTicketById(input.ticketId);
  if (!ticket) throw new Error("TICKET_NOT_FOUND");
  if (input.sellerId && ticket.sellerId !== input.sellerId) {
    throw new Error("TICKET_NOT_FOUND");
  }
  if (isTicketClosed(ticket.status)) throw new Error("TICKET_CLOSED");

  const existing = await listSellerTicketMessages(input.ticketId);
  if (input.clientMessageId) {
    const dup = existing.find((m) => m.clientMessageId === input.clientMessageId);
    if (dup) return dup;
  }

  const now = new Date().toISOString();
  const body = maskSensitiveText(input.body.trim());
  const message: TicketMessage = {
    id: randomUUID(),
    senderType: input.senderType,
    senderId: input.senderId ?? null,
    body,
    attachmentUrl: sanitizeTicketAttachmentUrl(input.attachmentUrl),
    attachmentName: input.attachmentName ?? null,
    attachmentMime: input.attachmentMime ?? null,
    clientMessageId: input.clientMessageId ?? null,
    replyToId: input.replyToId ?? null,
    createdAt: now,
    delivery: "sent",
  };
  const nextStatus = statusAfterSenderReply(input.senderType);

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_ticket_messages
          (id, ticket_id, sender_type, sender_id, body, attachment_url, attachment_name, attachment_mime,
           client_message_id, reply_to_id, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          message.id,
          input.ticketId,
          message.senderType,
          message.senderId,
          message.body,
          message.attachmentUrl,
          message.attachmentName,
          message.attachmentMime,
          message.clientMessageId,
          message.replyToId,
          message.createdAt,
        ],
      );
      await mysqlExecute(
        `UPDATE seller_tickets SET status = ?, updated_at = ? WHERE id = ?`,
        [nextStatus, now, input.ticketId],
      );
      return message;
    } catch (error) {
      if (isMysqlDuplicateKey(error) && input.clientMessageId) {
        const again = await listSellerTicketMessages(input.ticketId);
        const dup = again.find(
          (m) => m.clientMessageId === input.clientMessageId,
        );
        if (dup) return dup;
      }
      console.error(
        "[seller-tickets] addSellerTicketMessage mysql failed, falling back:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
    }
  }

  await loadSellerTicketsFs();
  ensureMemoryTicketFromRecord(ticket);

  if (input.senderType === "admin") {
    const msg = adminReplyMemoryTicket(
      input.ticketId,
      body,
      message.attachmentUrl,
      input.senderId,
    );
    if (!msg) throw new Error("TICKET_NOT_FOUND");
    msg.clientMessageId = message.clientMessageId;
    msg.replyToId = message.replyToId;
    return msg;
  }

  const msg = replyMemoryTicket(
    input.ticketId,
    input.sellerId ?? ticket.sellerId,
    body,
    message.attachmentUrl,
  );
  if (!msg) throw new Error("TICKET_NOT_FOUND");
  msg.clientMessageId = message.clientMessageId;
  msg.replyToId = message.replyToId;
  return msg;
}

export async function updateSellerTicketMeta(
  id: string,
  patch: {
    status?: string;
    priority?: string;
    lockedBy?: string | null;
    lockedAt?: string | null;
  },
): Promise<SellerTicketRecord | null> {
  const existing = await getSellerTicketById(id);
  if (!existing) return null;
  const now = new Date().toISOString();
  const status = patch.status ?? existing.status;
  const priority = patch.priority ?? existing.priority;
  const lockedBy =
    patch.lockedBy !== undefined ? patch.lockedBy : (existing.lockedBy ?? null);
  const lockedAt =
    patch.lockedAt !== undefined ? patch.lockedAt : (existing.lockedAt ?? null);

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `UPDATE seller_tickets
         SET status = ?, priority = ?, locked_by = ?, locked_at = ?, updated_at = ?
         WHERE id = ?`,
        [status, priority, lockedBy, lockedAt, now, id],
      );
      return {
        ...existing,
        status,
        priority,
        lockedBy,
        lockedAt,
        updatedAt: now,
      };
    } catch (error) {
      console.error(
        "[seller-tickets] updateSellerTicketMeta mysql failed:",
        error instanceof Error ? error.message : error,
      );
      if (!allowTicketMysqlFallthrough()) {
        throw new Error("MYSQL_UNAVAILABLE");
      }
    }
  }

  const mem = updateMemoryTicketMeta(id, { status, priority });
  if (!mem) return null;
  return {
    id: mem.id,
    sellerId: mem.sellerId,
    subject: mem.subject,
    category: mem.category,
    priority: mem.priority,
    status: mem.status,
    lockedBy,
    lockedAt,
    createdAt: mem.createdAt,
    updatedAt: mem.updatedAt,
  };
}
