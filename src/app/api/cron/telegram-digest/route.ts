import { NextResponse } from "next/server";
import { isProduction } from "@/lib/server/production";
import { getDashboardStats } from "@/lib/server/admin-platform-store";
import { getAllOrders } from "@/lib/server/orders";
import { countOpenUnifiedTickets } from "@/lib/server/unified-tickets";
import { getContactMessagesBySource } from "@/lib/server/newsletter";
import { notifyTelegram } from "@/lib/server/telegram-notify";

/**
 * cPanel cron (daily):
 * curl -fsS -H "Authorization: Bearer $CRON_SECRET" https://admin.hajiasal.ir/api/cron/telegram-digest
 */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { error: isProduction() ? "پیکربندی ناقص" : "CRON_SECRET تنظیم نشده" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization") ?? "";
  const bearer = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  const urlSecret = new URL(request.url).searchParams.get("secret") ?? "";
  if (bearer !== secret && urlSecret !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const stats = await getDashboardStats().catch(() => ({
      salesToday: 0,
      salesWeek: 0,
      salesMonth: 0,
      customersCount: 0,
      lowStockCount: 0,
      avgOrderValue: 0,
    }));
    const orders = await getAllOrders().catch(() => []);
    const pendingOrders = orders.filter(
      (o) => o.status === "pending_payment" || o.status === "confirmed",
    ).length;
    const openTickets = await countOpenUnifiedTickets().catch(() => 0);
    const messages = await getContactMessagesBySource("hajiasal").catch(
      () => [],
    );
    const unreadMessages = messages.filter((m) => !m.readAt).length;

    const result = await notifyTelegram("digest", {
      salesToday: stats.salesToday,
      salesWeek: stats.salesWeek,
      salesMonth: stats.salesMonth,
      pendingOrders,
      openTickets,
      unreadMessages,
      lowStockCount: stats.lowStockCount,
      customersCount: stats.customersCount,
      avgOrderValue: stats.avgOrderValue,
    });

    return NextResponse.json({
      success: true,
      sent: result.sent,
      skipped: result.skipped,
      error: result.error,
    });
  } catch (error) {
    console.error(
      "[cron/telegram-digest]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { success: false, error: "digest_failed" },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return POST(request);
}
