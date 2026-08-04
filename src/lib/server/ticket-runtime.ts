import { randomUUID } from "crypto";
import {
  DEFAULT_CANNED,
  detectDepartmentFromText,
  maskSensitiveText,
  statusAfterSenderReply,
  type TicketChannel,
  type TicketMessage,
  type TicketSenderType,
  AUTO_CLOSE_PENDING_DAYS,
} from "@/lib/tickets/types";
import { checkRateLimit, checkRateLimitAsync } from "@/lib/server/rate-limit";
import {
  isMysqlConfigured,
  mysqlQuery,
} from "@/lib/server/mysql";
import type { RowDataPacket } from "mysql2/promise";

export function assertMessageRateLimit(actorKey: string): {
  ok: boolean;
  retryAfterSec: number;
} {
  return checkRateLimit(`ticket-msg:${actorKey}`, 5, 10_000);
}

export async function assertMessageRateLimitAsync(actorKey: string): Promise<{
  ok: boolean;
  retryAfterSec: number;
}> {
  return checkRateLimitAsync(`ticket-msg:${actorKey}`, 5, 10_000);
}

export type RichTicketMessage = TicketMessage & {
  ticketId?: string;
};

type LockState = {
  lockedBy: string;
  lockedByName?: string;
  lockedAt: string;
};

type TypingState = {
  actorId: string;
  actorType: string;
  updatedAt: number;
};

type PresenceState = {
  actorId: string;
  actorType: string;
  status: "online" | "away" | "offline";
  updatedAt: number;
};

const locks = new Map<string, LockState>();
const typing = new Map<string, TypingState[]>();
const presence = new Map<string, PresenceState>();
const blocks = new Set<string>();
const cannedMemory = [...DEFAULT_CANNED];

function lockKey(channel: TicketChannel, ticketId: string) {
  return `${channel}:${ticketId}`;
}

export function acquireTicketLock(input: {
  channel: TicketChannel;
  ticketId: string;
  actorId: string;
  actorName?: string;
  force?: boolean;
}): { ok: true; lock: LockState } | { ok: false; lock: LockState } {
  const key = lockKey(input.channel, input.ticketId);
  const existing = locks.get(key);
  const now = Date.now();
  if (
    existing &&
    existing.lockedBy !== input.actorId &&
    now - new Date(existing.lockedAt).getTime() < 5 * 60_000 &&
    !input.force
  ) {
    return { ok: false, lock: existing };
  }
  const lock: LockState = {
    lockedBy: input.actorId,
    lockedByName: input.actorName,
    lockedAt: new Date().toISOString(),
  };
  locks.set(key, lock);
  return { ok: true, lock };
}

export function releaseTicketLock(input: {
  channel: TicketChannel;
  ticketId: string;
  actorId: string;
}): boolean {
  const key = lockKey(input.channel, input.ticketId);
  const existing = locks.get(key);
  if (!existing) return true;
  if (existing.lockedBy !== input.actorId) return false;
  locks.delete(key);
  return true;
}

export function getTicketLock(
  channel: TicketChannel,
  ticketId: string,
): LockState | null {
  const lock = locks.get(lockKey(channel, ticketId));
  if (!lock) return null;
  if (Date.now() - new Date(lock.lockedAt).getTime() > 5 * 60_000) {
    locks.delete(lockKey(channel, ticketId));
    return null;
  }
  return lock;
}

export function setTyping(input: {
  channel: TicketChannel;
  ticketId: string;
  actorId: string;
  actorType: string;
}): void {
  const key = lockKey(input.channel, input.ticketId);
  const now = Date.now();
  const list = (typing.get(key) ?? []).filter((t) => now - t.updatedAt < 5000);
  const idx = list.findIndex((t) => t.actorId === input.actorId);
  const entry = {
    actorId: input.actorId,
    actorType: input.actorType,
    updatedAt: now,
  };
  if (idx >= 0) list[idx] = entry;
  else list.push(entry);
  typing.set(key, list);
}

export function getTypingActors(
  channel: TicketChannel,
  ticketId: string,
  excludeActorId?: string,
): TypingState[] {
  const key = lockKey(channel, ticketId);
  const now = Date.now();
  const list = (typing.get(key) ?? []).filter((t) => now - t.updatedAt < 4000);
  typing.set(key, list);
  return list.filter((t) => t.actorId !== excludeActorId);
}

export function setPresence(input: {
  actorId: string;
  actorType: string;
  status: "online" | "away" | "offline";
}): void {
  presence.set(`${input.actorType}:${input.actorId}`, {
    ...input,
    updatedAt: Date.now(),
  });
}

export function getOperatorPresence(): Array<{
  actorId: string;
  status: "online" | "away" | "offline";
  updatedAt: number;
}> {
  const now = Date.now();
  const out: Array<{
    actorId: string;
    status: "online" | "away" | "offline";
    updatedAt: number;
  }> = [];
  for (const [key, value] of presence) {
    if (!key.startsWith("admin:")) continue;
    const stale = now - value.updatedAt > 60_000;
    out.push({
      actorId: value.actorId,
      status: stale ? "offline" : value.status,
      updatedAt: value.updatedAt,
    });
  }
  return out;
}

export function isAnyOperatorOnline(): boolean {
  return getOperatorPresence().some((p) => p.status === "online");
}

export function blockActor(key: string): void {
  blocks.add(key);
}

export function isBlocked(key: string): boolean {
  return blocks.has(key);
}

export function listCannedResponses() {
  return cannedMemory;
}

export async function listCannedResponsesAsync(): Promise<
  Array<{ shortcut: string; title: string; body: string }>
> {
  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT shortcut, title, body FROM ticket_canned_responses ORDER BY shortcut ASC`,
      );
      if (rows.length > 0) {
        return rows.map((r) => ({
          shortcut: String(r.shortcut),
          title: String(r.title),
          body: String(r.body),
        }));
      }
    } catch {
      /* use defaults */
    }
  }
  return cannedMemory;
}

export function resolveCanned(shortcut: string): string | null {
  const found = cannedMemory.find(
    (c) => c.shortcut === shortcut || c.shortcut === `/${shortcut.replace(/^\//, "")}`,
  );
  return found?.body ?? null;
}

export async function resolveCannedAsync(
  shortcut: string,
): Promise<string | null> {
  const list = await listCannedResponsesAsync();
  const found = list.find(
    (c) =>
      c.shortcut === shortcut ||
      c.shortcut === `/${shortcut.replace(/^\//, "")}`,
  );
  return found?.body ?? null;
}

export function prepareOutboundBody(body: string): {
  body: string;
  departmentHint: string;
} {
  const masked = maskSensitiveText(body.trim());
  return {
    body: masked,
    departmentHint: detectDepartmentFromText(masked),
  };
}

export function findByClientMessageId(
  messages: RichTicketMessage[],
  clientMessageId: string,
): RichTicketMessage | undefined {
  return messages.find((m) => m.clientMessageId === clientMessageId);
}

export function buildSystemMessage(input: {
  body: string;
  ticketId?: string;
}): RichTicketMessage {
  return {
    id: randomUUID(),
    ticketId: input.ticketId,
    senderType: "system",
    body: input.body,
    createdAt: new Date().toISOString(),
    isInternal: false,
  };
}

export function shouldAutoClose(ticket: {
  status: string;
  updatedAt: string;
}): boolean {
  if (ticket.status !== "pending" && ticket.status !== "answered") return false;
  const ageMs = Date.now() - new Date(ticket.updatedAt).getTime();
  return ageMs >= AUTO_CLOSE_PENDING_DAYS * 24 * 60 * 60 * 1000;
}

export function applyEditMessage(
  messages: RichTicketMessage[],
  messageId: string,
  newBody: string,
  editorId: string,
): RichTicketMessage | null {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg || msg.deletedAt) return null;
  if (msg.senderId && msg.senderId !== editorId && msg.senderType !== "admin") {
    return null;
  }
  msg.body = maskSensitiveText(newBody);
  msg.editedAt = new Date().toISOString();
  return msg;
}

export function softDeleteMessage(
  messages: RichTicketMessage[],
  messageId: string,
  actorId: string,
): RichTicketMessage | null {
  const msg = messages.find((m) => m.id === messageId);
  if (!msg) return null;
  if (msg.senderId && msg.senderId !== actorId && msg.senderType !== "admin") {
    return null;
  }
  msg.deletedAt = new Date().toISOString();
  msg.body = "";
  return msg;
}

export function statusAfterAdminOrUser(
  senderType: TicketSenderType,
): ReturnType<typeof statusAfterSenderReply> {
  return statusAfterSenderReply(senderType);
}

/** Test helpers */
export function __resetTicketRuntimeForTests(): void {
  locks.clear();
  typing.clear();
  presence.clear();
  blocks.clear();
}
