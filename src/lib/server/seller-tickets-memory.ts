import { randomUUID } from "node:crypto";

export type MemoryTicketMessage = {
  id: string;
  senderType: string;
  body: string;
  createdAt: string;
};

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

/** Shared in-memory tickets so list/create/detail stay consistent without MySQL. */
export const memorySellerTickets: MemoryTicket[] = [];

export function findMemoryTicket(
  id: string,
  sellerId: string,
): MemoryTicket | undefined {
  return memorySellerTickets.find((t) => t.id === id && t.sellerId === sellerId);
}

export function listMemoryTickets(sellerId: string): MemoryTicket[] {
  return memorySellerTickets.filter((t) => t.sellerId === sellerId);
}

export function createMemoryTicket(input: {
  sellerId: string;
  subject: string;
  category: string;
  priority: string;
  body: string;
}): MemoryTicket {
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
        body: input.body,
        createdAt: now,
      },
    ],
  };
  memorySellerTickets.unshift(ticket);
  return ticket;
}

export function replyMemoryTicket(
  id: string,
  sellerId: string,
  body: string,
): boolean {
  const ticket = findMemoryTicket(id, sellerId);
  if (!ticket) return false;
  const now = new Date().toISOString();
  ticket.messages.push({
    id: randomUUID(),
    senderType: "seller",
    body,
    createdAt: now,
  });
  ticket.status = "waiting";
  ticket.updatedAt = now;
  return true;
}
