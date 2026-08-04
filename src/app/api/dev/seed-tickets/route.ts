import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  upsertSupportTicket,
  addSupportTicketMessage,
  listSupportTickets,
} from "@/lib/server/support-tickets";
import { createMemoryTicket, memorySellerTickets } from "@/lib/server/seller-tickets-memory";
import { setPresence } from "@/lib/server/ticket-runtime";

/** Local-only seed for ticket chat QA. Disabled in production. */
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  setPresence({ actorId: "seed-admin", actorType: "admin", status: "online" });

  // Clean slate for local QA
  const { writeJsonFile } = await import("@/lib/server/db");
  await writeJsonFile("support-tickets.json", []);

  const samples = [
    {
      subject: "تأخیر در ارسال سفارش",
      customerName: "علی رضایی",
      customerPhone: "09121234501",
      customerId: "cust-seed-1",
      priority: "high" as const,
      thread: [
        { type: "customer" as const, body: "سلام، سفارشم از هفته پیش ارسال نشده. شماره سفارش HA-1042." },
        { type: "admin" as const, body: "سلام علی جان، در حال پیگیری با انبار هستم. لطفاً چند دقیقه صبر کنید." },
        { type: "customer" as const, body: "ممنون. کد رهگیری هم اگر دارید بفرستید." },
        { type: "admin" as const, body: "کد رهگیری: 1234567890\nوضعیت: تحویل به پست" },
      ],
    },
    {
      subject: "سوال درباره عسل گون",
      customerName: "مریم احمدی",
      customerPhone: "09121234502",
      customerId: "cust-seed-2",
      priority: "normal" as const,
      thread: [
        { type: "customer" as const, body: "این عسل برای کودک دو ساله مناسب است؟" },
        { type: "system" as const, body: "به پشتیبانی زنده متصل شدید. لطفاً منتظر پاسخ اپراتور بمانید." },
        { type: "admin" as const, body: "برای زیر یک سال توصیه نمی‌شود؛ برای دو سال با مقدار کم مشکلی نیست. **/order**" },
      ],
    },
    {
      subject: "مشکل درگاه پرداخت",
      customerName: "حسین کریمی",
      customerPhone: "09121234503",
      customerId: "cust-seed-3",
      priority: "high" as const,
      thread: [
        { type: "customer" as const, body: "خطای درگاه بانکی می‌دهد و پول کم شد ولی سفارش ثبت نشد." },
        { type: "admin" as const, body: "درخواست عودت وجه شما ثبت شد. معمولاً تا ۷۲ ساعت کاری نتیجه اعلام می‌شود.", internal: true },
        { type: "admin" as const, body: "سلام، تراکنش را چک کردیم. تا ۴۸ ساعت به حساب برمی‌گردد. اگر نشد دوباره پیام دهید." },
      ],
    },
  ];

  const created: string[] = [];

  for (const sample of samples) {
    const ticket = await upsertSupportTicket({
      subject: sample.subject,
      customerName: sample.customerName,
      customerPhone: sample.customerPhone,
      customerId: sample.customerId,
      priority: sample.priority,
      status: "open",
      department: sample.subject.includes("درگاه") ? "finance" : "general",
    });
    created.push(ticket.id);

    for (const msg of sample.thread) {
      await addSupportTicketMessage({
        ticketId: ticket.id,
        senderType: msg.type,
        senderId: msg.type === "customer" ? sample.customerId : "admin-seed",
        body: msg.body,
        isInternal: "internal" in msg ? Boolean(msg.internal) : false,
        clientMessageId: randomUUID(),
      });
    }
  }

  // Seller sample tickets (filesystem-backed in local when MySQL down)
  memorySellerTickets.length = 0;
  const s1 = await createMemoryTicket({
    sellerId: "s1",
    subject: "عدم نمایش محصول در فروشگاه",
    category: "products",
    priority: "high",
    body: "محصول عسل کنار را ثبت کردم ولی در شاپ دیده نمی‌شود.",
  });
  const s2 = await createMemoryTicket({
    sellerId: "s1",
    subject: "سوال کمیسیون",
    category: "wallet",
    priority: "normal",
    body: "درصد کمیسیون این ماه چقدر است؟",
  });

  const all = await listSupportTickets();

  return NextResponse.json({
    success: true,
    customerTickets: created.length,
    sellerTickets: [s1.id, s2.id],
    totalCustomer: all.length,
    tip: "باز کنید: /admin/tickets",
  });
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const all = await listSupportTickets();
  return NextResponse.json({
    count: all.length,
    items: all.slice(0, 20).map((t) => ({
      id: t.id,
      subject: t.subject,
      status: t.status,
      customerName: t.customerName,
    })),
  });
}
