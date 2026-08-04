import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installRequireAdminPermissionMock,
  authedAdminRequest,
  readJson,
} from "../admin/harness";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson as readSellerJson,
} from "../seller/harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    requireAdminPermission: vi.fn(),
  };
});

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
    getSellerByIdAsync: vi.fn(async (id: string) => ({
      id,
      shopName: "فروشگاه تست",
      ownerName: "مالک",
      phone: "09120000000",
    })),
  };
});

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  isMysqlUsable: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  toIso: (v: unknown) => String(v),
  newId: () => `id_${Math.random().toString(36).slice(2, 10)}`,
}));

vi.mock("@/lib/server/production", () => ({
  canUseFilesystemPersistence: () => false,
  isProduction: () => false,
  allowTicketMysqlFallthrough: () => true,
  isMysqlDuplicateKey: () => false,
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { getSellerFromRequest } from "@/lib/server/sellers";
import { getSessionFromRequest } from "@/lib/auth/session";
import { __resetSupportTicketsMemoryForTests } from "@/lib/server/support-tickets";
import { __resetSellerTicketsMemoryForTests } from "@/lib/server/seller-tickets-memory";
import { upsertSupportTicket } from "@/lib/server/support-tickets";

import { GET as adminList, POST as adminCreate } from "@/app/api/admin/tickets/route";
import {
  GET as adminDetail,
  PATCH as adminPatch,
} from "@/app/api/admin/tickets/[id]/route";
import { POST as adminReply } from "@/app/api/admin/tickets/[id]/reply/route";
import {
  GET as accountList,
  POST as accountCreate,
} from "@/app/api/account/tickets/route";
import {
  GET as accountDetail,
  POST as accountReply,
} from "@/app/api/account/tickets/[id]/route";
import { POST as sellerCreate } from "@/app/api/seller/tickets/route";
import {
  GET as sellerDetail,
  POST as sellerReply,
} from "@/app/api/seller/tickets/[id]/route";

const adminMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);
const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

function asCustomer(userId: string, fullName = "مشتری تست") {
  (getSessionFromRequest as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    userId,
    phone: "09121234567",
    fullName,
    exp: Date.now() / 1000 + 3600,
  });
}

describe("unified ticket chat behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetSupportTicketsMemoryForTests();
    __resetSellerTicketsMemoryForTests();
    adminMock.asRole("support");
    sellerMock.asSeller({ id: "s-ticket-a" });
  });

  it("customer creates ticket, lists only own, reply sets waiting", async () => {
    asCustomer("cust-a");
    const createRes = await accountCreate(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "مشکل پرداخت",
          body: "پرداخت انجام نشد",
          priority: "high",
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = await readJson(createRes);
    const ticketId = created.id as string;

    asCustomer("cust-b");
    const otherCreate = await accountCreate(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "دیگر",
          body: "متن دیگر",
        }),
      }),
    );
    expect(otherCreate.status).toBe(200);

    asCustomer("cust-a");
    const listRes = await accountList(
      new Request("http://localhost/api/account/tickets"),
    );
    const list = await readJson(listRes);
    const tickets = list.tickets as Array<{ id: string }>;
    expect(tickets).toHaveLength(1);
    expect(tickets[0].id).toBe(ticketId);

    const replyRes = await accountReply(
      new Request(`http://localhost/api/account/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "پیام دوم مشتری" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(replyRes.status).toBe(200);

    const detailRes = await accountDetail(
      new Request(`http://localhost/api/account/tickets/${ticketId}`),
      { params: Promise.resolve({ id: ticketId }) },
    );
    const detail = await readJson(detailRes);
    expect((detail.ticket as { status: string }).status).toBe("waiting");
  });

  it("customer cannot access another customer ticket", async () => {
    asCustomer("cust-a");
    const createRes = await accountCreate(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "خصوصی", body: "متن خصوصی من" }),
      }),
    );
    const ticketId = (await readJson(createRes)).id as string;

    asCustomer("cust-b");
    const detailRes = await accountDetail(
      new Request(`http://localhost/api/account/tickets/${ticketId}`),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(detailRes.status).toBe(404);
  });

  it("admin replies to customer ticket → answered", async () => {
    asCustomer("cust-a");
    const createRes = await accountCreate(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "سوال", body: "سلام" }),
      }),
    );
    const ticketId = (await readJson(createRes)).id as string;

    const replyRes = await adminReply(
      authedAdminRequest(`http://localhost/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "پاسخ پشتیبانی", channel: "customer" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(replyRes.status).toBe(200);

    const detailRes = await adminDetail(
      authedAdminRequest(
        `http://localhost/api/admin/tickets/${ticketId}?channel=customer`,
      ),
      { params: Promise.resolve({ id: ticketId }) },
    );
    const detail = await readJson(detailRes);
    expect((detail.ticket as { status: string }).status).toBe("pending");
    const messages = detail.messages as Array<{ senderType: string; body: string }>;
    expect(messages.some((m) => m.senderType === "admin")).toBe(true);
  });

  it("admin replies to seller ticket → pending; seller reply → waiting", async () => {
    const createRes = await sellerCreate(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "مشکل پنل",
          body: "نمی‌توانم محصول ثبت کنم",
        }),
      }),
    );
    const ticketId = (await readSellerJson(createRes)).id as string;

    const adminReplyRes = await adminReply(
      authedAdminRequest(`http://localhost/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "در حال بررسی", channel: "seller" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(adminReplyRes.status).toBe(200);

    let detail = await readSellerJson(
      await sellerDetail(
        authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`),
        { params: Promise.resolve({ id: ticketId }) },
      ),
    );
    expect((detail.ticket as { status: string }).status).toBe("pending");

    const sellerReplyRes = await sellerReply(
      authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "ممنون، هنوز مشکل دارم" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(sellerReplyRes.status).toBe(200);

    detail = await readSellerJson(
      await sellerDetail(
        authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`),
        { params: Promise.resolve({ id: ticketId }) },
      ),
    );
    expect((detail.ticket as { status: string }).status).toBe("waiting");
  });

  it("closed ticket rejects new messages", async () => {
    asCustomer("cust-a");
    const createRes = await accountCreate(
      new Request("http://localhost/api/account/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "بسته شو", body: "متن اولیه کافی" }),
      }),
    );
    const ticketId = (await readJson(createRes)).id as string;

    await adminPatch(
      authedAdminRequest(`http://localhost/api/admin/tickets/${ticketId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "closed", channel: "customer" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );

    const replyRes = await accountReply(
      new Request(`http://localhost/api/account/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "نباید برود" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(replyRes.status).toBe(400);
  });

  it("RBAC: warehouse cannot reply to tickets", async () => {
    adminMock.asRole("warehouse");
    const ticket = await upsertSupportTicket({
      subject: "تست rbac",
      customerId: "c1",
      status: "open",
    });
    const replyRes = await adminReply(
      authedAdminRequest(`http://localhost/api/admin/tickets/${ticket.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "ممنوع", channel: "customer" }),
      }),
      { params: Promise.resolve({ id: ticket.id }) },
    );
    expect(replyRes.status).toBe(403);
  });

  it("upsert updates customer name and phone", async () => {
    const ticket = await upsertSupportTicket({
      subject: "ویرایش",
      customerName: "علی",
      customerPhone: "09120000001",
    });
    const updated = await upsertSupportTicket({
      id: ticket.id,
      subject: "ویرایش",
      customerName: "رضا",
      customerPhone: "09120000002",
    });
    expect(updated.customerName).toBe("رضا");
    expect(updated.customerPhone).toBe("09120000002");

    adminMock.asRole("support");
    const listRes = await adminList(
      authedAdminRequest("http://localhost/api/admin/tickets?channel=customer"),
    );
    const list = await readJson(listRes);
    const found = (list.items as Array<{ id: string; partyName?: string }>).find(
      (t) => t.id === ticket.id,
    );
    expect(found?.partyName).toBe("رضا");
  });

  it("admin unified list includes seller tickets", async () => {
    await sellerCreate(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "تیکت فروشنده در لیست",
          body: "متن تیکت فروشنده اینجا",
        }),
      }),
    );

    const listRes = await adminList(
      authedAdminRequest("http://localhost/api/admin/tickets?channel=seller"),
    );
    const list = await readJson(listRes);
    const items = list.items as Array<{ channel: string; subject: string }>;
    expect(items.some((i) => i.channel === "seller")).toBe(true);
  });

  it("admin create ticket works", async () => {
    const res = await adminCreate(
      authedAdminRequest("http://localhost/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "دستی",
          customerName: "مهمان",
          priority: "normal",
          body: "سلام از ادمین",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const data = await readJson(res);
    expect((data.item as { subject: string }).subject).toBe("دستی");
  });
});
