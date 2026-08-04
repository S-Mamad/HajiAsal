import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  acquireTicketLock,
  getTicketLock,
  releaseTicketLock,
  setPresence,
  setTyping,
  getTypingActors,
  listCannedResponsesAsync,
} from "@/lib/server/ticket-runtime";
import {
  getSupportTicket,
  upsertSupportTicket,
} from "@/lib/server/support-tickets";
import {
  getSellerTicketById,
  updateSellerTicketMeta,
} from "@/lib/server/seller-tickets-memory";
import type { TicketChannel } from "@/lib/tickets/types";

type Params = { params: Promise<{ id: string }> };

async function persistLock(
  channel: TicketChannel,
  ticketId: string,
  lock: { lockedBy: string; lockedAt: string } | null,
) {
  if (channel === "customer") {
    const existing = await getSupportTicket(ticketId);
    if (!existing) return;
    await upsertSupportTicket({
      ...existing,
      lockedBy: lock?.lockedBy ?? null,
      lockedAt: lock?.lockedAt ?? null,
    });
    return;
  }
  await updateSellerTicketMeta(ticketId, {
    lockedBy: lock?.lockedBy ?? null,
    lockedAt: lock?.lockedAt ?? null,
  });
}

export async function GET(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "tickets.view");
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const url = new URL(request.url);
  const channel = (url.searchParams.get("channel") ?? "customer") as TicketChannel;
  let lock = getTicketLock(channel, id);
  if (!lock) {
    if (channel === "customer") {
      const t = await getSupportTicket(id);
      if (t?.lockedBy && t.lockedAt) {
        lock = {
          lockedBy: t.lockedBy,
          lockedAt: t.lockedAt,
        };
      }
    } else {
      const t = await getSellerTicketById(id);
      if (t?.lockedBy && t.lockedAt) {
        lock = {
          lockedBy: t.lockedBy,
          lockedAt: t.lockedAt,
        };
      }
    }
  }
  const typing = getTypingActors(channel, id, gate.ctx.user?.id);
  return NextResponse.json({ lock, typing, canned: await listCannedResponsesAsync() });
}

const lockSchema = z.object({
  channel: z.enum(["customer", "seller"]).default("customer"),
  action: z.enum(["acquire", "release", "typing", "presence"]),
  force: z.boolean().optional(),
  status: z.enum(["online", "away", "offline"]).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const gate = await gateAdmin(request, "tickets.manage");
  if (!gate.ok) return gate.response;
  const { id } = await params;
  const parsed = lockSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }
  const adminId = gate.ctx.user?.id ?? "admin";
  const name = gate.ctx.user?.fullName ?? "اپراتور";

  if (parsed.data.action === "presence") {
    setPresence({
      actorId: adminId,
      actorType: "admin",
      status: parsed.data.status ?? "online",
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "typing") {
    setTyping({
      channel: parsed.data.channel,
      ticketId: id,
      actorId: adminId,
      actorType: "admin",
    });
    return NextResponse.json({ success: true });
  }

  if (parsed.data.action === "release") {
    const ok = releaseTicketLock({
      channel: parsed.data.channel,
      ticketId: id,
      actorId: adminId,
    });
    if (ok) {
      try {
        await persistLock(parsed.data.channel, id, null);
      } catch (error) {
        if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
          return NextResponse.json(
            { error: "پایگاه داده در دسترس نیست" },
            { status: 503 },
          );
        }
        throw error;
      }
    }
    return NextResponse.json({ success: ok });
  }

  const result = acquireTicketLock({
    channel: parsed.data.channel,
    ticketId: id,
    actorId: adminId,
    actorName: name,
    force: parsed.data.force,
  });
  if (!result.ok) {
    return NextResponse.json(
      {
        error: `اپراتور ${result.lock.lockedByName ?? result.lock.lockedBy} در حال بررسی این تیکت است`,
        lock: result.lock,
      },
      { status: 409 },
    );
  }
  try {
    await persistLock(parsed.data.channel, id, {
      lockedBy: result.lock.lockedBy,
      lockedAt: result.lock.lockedAt,
    });
  } catch (error) {
    releaseTicketLock({
      channel: parsed.data.channel,
      ticketId: id,
      actorId: adminId,
    });
    if (error instanceof Error && error.message === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در قفل تیکت" }, { status: 500 });
  }
  setPresence({ actorId: adminId, actorType: "admin", status: "online" });
  return NextResponse.json({ success: true, lock: result.lock });
}
