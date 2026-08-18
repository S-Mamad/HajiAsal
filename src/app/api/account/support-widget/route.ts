import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  countCustomerUnreadStaffMessages,
  listSupportTicketsByCustomer,
  upsertSupportTicket,
} from "@/lib/server/support-tickets";
import { resolveSupportActor } from "@/lib/server/support-guest";
import { buildCustomerValueContext } from "@/lib/server/support-widget-context";
import { isAnyOperatorOnline } from "@/lib/server/ticket-runtime";
import { isWithinSupportHours } from "@/lib/support-fab/hours";
import {
  classifyPathname,
  type SupportPageKind,
} from "@/lib/support-fab/context";
import { OPEN_TICKET_STATUSES } from "@/lib/tickets/types";

const pageKindSchema = z.enum([
  "home",
  "shop",
  "product",
  "cart",
  "checkout",
  "account",
  "orders",
  "tickets",
  "other",
]);

function parsePageKind(path: string, fallback?: SupportPageKind): SupportPageKind {
  if (fallback) return fallback;
  try {
    const url = new URL(path, "https://hajiasal.ir");
    return classifyPathname(url.pathname);
  } catch {
    return classifyPathname(path);
  }
}

async function buildHandshake(
  request: Request,
  pageKind: SupportPageKind,
  currentUrl?: string,
) {
  const withinHours = isWithinSupportHours();
  const operatorOnline = isAnyOperatorOnline();
  const session = getSessionFromRequest(request);
  const actor = resolveSupportActor(session, request);

  if (!actor) {
    return {
      authenticated: false as const,
      identified: false as const,
      kind: null as "user" | "guest" | null,
      withinHours,
      operatorOnline,
      unreadCount: 0,
      openTicketId: null as string | null,
      pendingPaymentCount: 0,
      shippingOrderId: null as string | null,
      accountValue: 0,
      vip: false,
      vipSummary: null as string | null,
      user: null as { fullName: string | null; phone: string } | null,
      currentUrl: currentUrl ?? null,
      pageKind,
    };
  }

  const [value, tickets, unreadCount] = await Promise.all([
    actor.kind === "user"
      ? buildCustomerValueContext({
          userId: actor.customerId,
          fullName: actor.fullName,
          pageKind,
          currentUrl,
        })
      : Promise.resolve({
          pageKind,
          pendingPaymentCount: 0,
          shippingOrderId: null as string | null,
          accountValue: 0,
          vip: false,
          vipSummary: "",
        }),
    listSupportTicketsByCustomer(actor.customerId),
    countCustomerUnreadStaffMessages(actor.customerId),
  ]);

  const openTickets = tickets
    .filter((ticket) => OPEN_TICKET_STATUSES.includes(ticket.status as never))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return {
    authenticated: actor.kind === "user",
    identified: true as const,
    kind: actor.kind,
    withinHours,
    operatorOnline,
    unreadCount,
    openTicketId: openTickets[0]?.id ?? null,
    pendingPaymentCount: value.pendingPaymentCount,
    shippingOrderId: value.shippingOrderId,
    accountValue: value.accountValue,
    vip: value.vip,
    vipSummary: value.vipSummary || null,
    user: { fullName: actor.fullName, phone: actor.phone },
    currentUrl: currentUrl ?? null,
    pageKind,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const pageKind = pageKindSchema.safeParse(url.searchParams.get("pageKind"));
  const currentUrl = url.searchParams.get("currentUrl") ?? undefined;
  const kind = pageKind.success
    ? pageKind.data
    : parsePageKind(currentUrl ?? "/");

  try {
    const payload = await buildHandshake(request, kind, currentUrl);
    return NextResponse.json(payload);
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در اتصال پشتیبانی" }, { status: 500 });
  }
}

const postSchema = z.object({
  currentUrl: z.string().max(500).optional(),
  pageKind: pageKindSchema.optional(),
  productOutOfStock: z.boolean().optional(),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  const actor = resolveSupportActor(session, request);
  if (!actor) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = postSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const pageKind = parsed.data.pageKind ?? parsePageKind(parsed.data.currentUrl ?? "/");

  try {
    const payload = await buildHandshake(
      request,
      pageKind,
      parsed.data.currentUrl,
    );

    if (payload.openTicketId) {
      const tickets = await listSupportTicketsByCustomer(actor.customerId);
      const open = tickets.find((ticket) => ticket.id === payload.openTicketId);
      if (open) {
        await upsertSupportTicket({
          ...open,
          customerName: actor.fullName?.trim() || actor.phone,
          customerPhone: actor.phone,
          meta: {
            ...(open.meta ?? {}),
            currentUrl: parsed.data.currentUrl,
            pageKind,
            productOutOfStock: parsed.data.productOutOfStock,
            pendingPaymentCount: payload.pendingPaymentCount,
            shippingOrderId: payload.shippingOrderId,
            accountValue: payload.accountValue,
            vip: payload.vip,
            vipSummary: payload.vipSummary,
            userAgent: request.headers.get("user-agent") ?? undefined,
            identityKind: actor.kind,
          },
        });
      }
    }

    return NextResponse.json({ success: true, ...payload });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در اتصال پشتیبانی" }, { status: 500 });
  }
}
