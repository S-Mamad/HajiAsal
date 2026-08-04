import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
  };
});

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: () => false,
  isMysqlUsable: () => false,
  mysqlExecute: vi.fn(),
  mysqlQuery: vi.fn(),
  mysqlQueryOne: vi.fn(),
  toIso: (v: unknown) => String(v),
}));

vi.mock("@/lib/server/seller-activity", () => ({
  logSellerActivity: vi.fn(async () => undefined),
}));

import { GET, POST } from "@/app/api/seller/tickets/route";
import { GET as GET_ID, POST as POST_ID } from "@/app/api/seller/tickets/[id]/route";
import { getSellerFromRequest } from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

describe("seller tickets behavior (memory path)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sellerMock.asSeller({ id: "s-ticket-a" });
  });

  it("POST creates ticket and GET lists it", async () => {
    const createRes = await POST(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "مشکل سفارش",
          body: "سفارش من گیر کرده است",
          category: "orders",
          priority: "normal",
        }),
      }),
    );
    expect(createRes.status).toBe(200);
    const created = await readJson(createRes);
    expect(created.success).toBe(true);
    const ticketId = created.id as string;
    expect(ticketId).toBeTruthy();

    const listRes = await GET(
      authedSellerRequest("http://localhost/api/seller/tickets"),
    );
    expect(listRes.status).toBe(200);
    const list = await readJson(listRes);
    const tickets = list.tickets as Array<{ id: string; subject: string }>;
    expect(tickets.some((t) => t.id === ticketId)).toBe(true);

    const detailRes = await GET_ID(
      authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(detailRes.status).toBe(200);
    const detail = await readJson(detailRes);
    expect((detail.ticket as { id: string }).id).toBe(ticketId);
    expect(Array.isArray(detail.messages)).toBe(true);
  });

  it("POST reply works on own ticket", async () => {
    const createRes = await POST(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "پیگیری",
          body: "متن اولیه تیکت",
        }),
      }),
    );
    const ticketId = (await readJson(createRes)).id as string;

    const replyRes = await POST_ID(
      authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: "پیام دوم فروشنده" }),
      }),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(replyRes.status).toBe(200);

    const detailRes = await GET_ID(
      authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`),
      { params: Promise.resolve({ id: ticketId }) },
    );
    const detail = await readJson(detailRes);
    const messages = detail.messages as Array<{ body: string }>;
    expect(messages.some((m) => m.body.includes("پیام دوم"))).toBe(true);
  });

  it("GET detail returns 404 for other seller ticket", async () => {
    const createRes = await POST(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: "خصوصی",
          body: "فقط برای فروشنده الف",
        }),
      }),
    );
    const ticketId = (await readJson(createRes)).id as string;

    sellerMock.asSeller({ id: "s-ticket-b" });
    const detailRes = await GET_ID(
      authedSellerRequest(`http://localhost/api/seller/tickets/${ticketId}`),
      { params: Promise.resolve({ id: ticketId }) },
    );
    expect(detailRes.status).toBe(404);
  });

  it("POST invalid body returns 400", async () => {
    const res = await POST(
      authedSellerRequest("http://localhost/api/seller/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: "x", body: "y" }),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("denied without tickets.manage", async () => {
    sellerMock.asSellerWithout("tickets.manage", { id: "s-ticket-a" });
    const res = await GET(
      authedSellerRequest("http://localhost/api/seller/tickets"),
    );
    expect(res.status).toBe(403);
  });
});
