import { getAllOrders } from "./orders";
import { countOpenUnifiedTickets } from "./unified-tickets";
import { getContactMessagesBySource } from "./newsletter";
import { getDashboardStats } from "./admin-platform-store";
import {
  notifyTelegram,
  type DigestPayload,
  type TelegramNotifyResult,
} from "./telegram-notify";
import {
  formatTehranDigestStamp,
  statsFromStoredOrders,
  type TelegramSalesStats,
} from "./telegram-sales-stats";

export type DigestBundle = {
  sales: TelegramSalesStats;
  payload: DigestPayload;
};

export async function loadTelegramDigestBundle(): Promise<DigestBundle> {
  const orders = await getAllOrders().catch(() => []);
  const dash = await getDashboardStats().catch(() => ({
    customersCount: 0,
    lowStockCount: 0,
  }));
  const sales = statsFromStoredOrders(orders, {
    customersCount: dash.customersCount,
    lowStockCount: dash.lowStockCount,
  });
  const openTickets = await countOpenUnifiedTickets().catch(() => 0);
  const messages = await getContactMessagesBySource("hajiasal").catch(
    () => [],
  );
  const unreadMessages = messages.filter((m) => !m.readAt).length;

  const payload: DigestPayload = {
    salesToday: sales.salesToday,
    salesWeek: sales.salesWeek,
    salesMonth: sales.salesMonth,
    salesYesterday: sales.salesYesterday,
    ordersToday: sales.ordersToday,
    ordersWeek: sales.ordersWeek,
    ordersMonth: sales.ordersMonth,
    ordersYesterday: sales.ordersYesterday,
    pendingOrders: sales.pendingOrders,
    pendingOrdersFresh: sales.pendingOrdersFresh,
    pendingOrdersStale: sales.pendingOrdersStale,
    openTickets,
    unreadMessages,
    lowStockCount: sales.lowStockCount ?? dash.lowStockCount ?? 0,
    customersCount: sales.customersCount ?? dash.customersCount ?? 0,
    avgOrderValue: sales.avgOrderValue,
    avgOrderValueToday: sales.avgOrderValueToday,
    avgOrderValueWeek: sales.avgOrderValueWeek,
    salesZibalToday: sales.salesZibalToday,
    salesSnappayToday: sales.salesSnappayToday,
    reportStamp: formatTehranDigestStamp(),
  };

  return { sales, payload };
}

export async function sendTelegramDigest(): Promise<
  TelegramNotifyResult & { sales: TelegramSalesStats }
> {
  const { sales, payload } = await loadTelegramDigestBundle();
  const result = await notifyTelegram("digest", payload);
  return { ...result, sales };
}
