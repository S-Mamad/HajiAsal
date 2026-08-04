import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  createCustomerTicket,
  listSupportTicketsByCustomer,
} from "@/lib/server/support-tickets";
import { assertMessageRateLimitAsync } from "@/lib/server/ticket-runtime";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tickets = await listSupportTicketsByCustomer(session.userId);
  return NextResponse.json({ tickets });
}

const createSchema = z.object({
  subject: z.string().min(3).max(200),
  body: z.string().min(3).max(5000),
  priority: z.enum(["low", "normal", "high"]).default("normal"),
  meta: z
    .object({
      currentUrl: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await assertMessageRateLimitAsync(
    `customer-create:${session.userId}`,
  );
  if (!rl.ok) {
    return NextResponse.json(
      {
        error: "ایجاد تیکت بیش از حد مجاز است",
        retryAfterSec: rl.retryAfterSec,
      },
      { status: 429 },
    );
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  try {
    const { ticket } = await createCustomerTicket({
      customerId: session.userId,
      customerName: session.fullName,
      customerPhone: session.phone,
      subject: parsed.data.subject,
      body: parsed.data.body,
      priority: parsed.data.priority,
      meta: {
        ...(parsed.data.meta ?? {}),
        userAgent: request.headers.get("user-agent") ?? undefined,
      },
    });

    return NextResponse.json({ success: true, id: ticket.id, ticket });
  } catch (error) {
    const code = error instanceof Error ? error.message : "";
    if (code === "MYSQL_UNAVAILABLE") {
      return NextResponse.json(
        { error: "پایگاه داده در دسترس نیست" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "خطا در ایجاد تیکت" }, { status: 500 });
  }
}
