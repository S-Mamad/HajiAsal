import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  addSupportTicketMessage,
  getSupportTicket,
  listSupportTicketMessages,
  upsertSupportTicket,
} from "@/lib/server/support-tickets";
import {
  assertMessageRateLimitAsync,
  isBlocked,
  setTyping,
} from "@/lib/server/ticket-runtime";

type Params = { params: Promise<{ id: string }> };

async function ownedTicket(userId: string, id: string) {
  const ticket = await getSupportTicket(id);
  if (!ticket || ticket.customerId !== userId) return null;
  return ticket;
}

export async function GET(request: Request, { params }: Params) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ticket = await ownedTicket(session.userId, id);
  if (!ticket) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }
  const messages = (await listSupportTicketMessages(id)).filter(
    (m) => !m.isInternal,
  );
  return NextResponse.json({ ticket, messages });
}

const replySchema = z.object({
  body: z.string().max(5000).optional(),
  attachmentUrl: z
    .string()
    .url()
    .or(z.string().startsWith("/"))
    .nullable()
    .optional(),
  attachmentName: z.string().max(255).nullable().optional(),
  attachmentMime: z.string().max(120).nullable().optional(),
  clientMessageId: z.string().max(64).optional(),
  replyToId: z.string().nullable().optional(),
  typing: z.boolean().optional(),
});

const patchSchema = z.object({
  status: z.enum(["open", "closed"]).optional(),
  csatScore: z.number().int().min(1).max(5).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const ticket = await ownedTicket(session.userId, id);
  if (!ticket) {
    return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
  }

  if (isBlocked(`user:${session.userId}`)) {
    return NextResponse.json({ error: "حساب مسدود است" }, { status: 403 });
  }

  const parsed = replySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "متن نامعتبر است" }, { status: 400 });
  }

  if (parsed.data.typing) {
    setTyping({
      channel: "customer",
      ticketId: id,
      actorId: session.userId,
      actorType: "customer",
    });
    return NextResponse.json({ success: true });
  }

  if (!parsed.data.body?.trim()) {
    return NextResponse.json({ error: "متن نامعتبر است" }, { status: 400 });
  }

  const rl = await assertMessageRateLimitAsync(`customer:${session.userId}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "ارسال بیش از حد مجاز است", retryAfterSec: rl.retryAfterSec },
      { status: 429 },
    );
  }

  try {
    const message = await addSupportTicketMessage({
      ticketId: id,
      senderType: "customer",
      senderId: session.userId,
      body: parsed.data.body.trim(),
      attachmentUrl: parsed.data.attachmentUrl ?? null,
      attachmentName: parsed.data.attachmentName ?? null,
      attachmentMime: parsed.data.attachmentMime ?? null,
      clientMessageId: parsed.data.clientMessageId,
      replyToId: parsed.data.replyToId,
    });
    return NextResponse.json({ success: true, message });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "TICKET_CLOSED") {
      return NextResponse.json({ error: "تیکت بسته است" }, { status: 400 });
    }
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در ارسال" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const ticket = await ownedTicket(session.userId, id);
    if (!ticket) {
      return NextResponse.json({ error: "تیکت یافت نشد" }, { status: 404 });
    }

    const parsed = patchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const item = await upsertSupportTicket({
      ...ticket,
      status: parsed.data.status ?? ticket.status,
      csatScore: parsed.data.csatScore ?? ticket.csatScore,
    });
    return NextResponse.json({ success: true, ticket: item });
  } catch (error) {
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا" }, { status: 500 });
  }
}
