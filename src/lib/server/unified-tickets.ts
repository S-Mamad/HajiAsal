import {
  listSupportTickets,
  type SupportTicketRecord,
} from "@/lib/server/support-tickets";
import {
  listAllSellerTickets,
  type SellerTicketRecord,
} from "@/lib/server/seller-tickets-memory";
import type { UnifiedTicketListItem } from "@/lib/tickets/types";
import { BADGE_TICKET_STATUSES } from "@/lib/tickets/types";

function mapCustomer(t: SupportTicketRecord): UnifiedTicketListItem {
  return {
    id: t.id,
    channel: "customer",
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    partyName: t.customerName ?? null,
    partyPhone: t.customerPhone ?? null,
    customerId: t.customerId ?? null,
    assignedTo: t.assignedTo ?? null,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

function mapSeller(t: SellerTicketRecord): UnifiedTicketListItem {
  return {
    id: t.id,
    channel: "seller",
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    partyName: null,
    sellerId: t.sellerId,
    category: t.category,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt,
  };
}

export async function listUnifiedTickets(filters?: {
  channel?: "customer" | "seller" | "all";
  status?: string;
  priority?: string;
  q?: string;
}): Promise<UnifiedTicketListItem[]> {
  const channel = filters?.channel ?? "all";
  const [customer, seller] = await Promise.all([
    channel === "seller" ? Promise.resolve([]) : listSupportTickets(),
    channel === "customer" ? Promise.resolve([]) : listAllSellerTickets(),
  ]);

  let items: UnifiedTicketListItem[] = [
    ...customer.map(mapCustomer),
    ...seller.map(mapSeller),
  ];

  if (filters?.status && filters.status !== "all") {
    const status = filters.status;
    if (status === "pending" || status === "answered") {
      items = items.filter(
        (t) => t.status === "pending" || t.status === "answered",
      );
    } else {
      items = items.filter((t) => t.status === status);
    }
  }
  if (filters?.priority && filters.priority !== "all") {
    items = items.filter((t) => t.priority === filters.priority);
  }
  if (filters?.q?.trim()) {
    const q = filters.q.trim().toLowerCase();
    items = items.filter((t) => {
      const hay = `${t.subject} ${t.partyName ?? ""} ${t.partyPhone ?? ""} ${t.sellerId ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }

  items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return items;
}

export async function countOpenUnifiedTickets(): Promise<number> {
  const items = await listUnifiedTickets();
  return items.filter((t) => BADGE_TICKET_STATUSES.has(t.status)).length;
}
