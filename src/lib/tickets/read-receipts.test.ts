import { describe, expect, it } from "vitest";
import {
  applyDeliveryReceipts,
  countUnreadStaffMessages,
  formatUnreadBadge,
} from "./read-receipts";

describe("applyDeliveryReceipts", () => {
  it("marks customer messages read after admin watermark", () => {
    const out = applyDeliveryReceipts(
      [
        {
          senderType: "customer",
          createdAt: "2026-08-13T10:00:00.000Z",
        },
        {
          senderType: "customer",
          createdAt: "2026-08-13T12:00:00.000Z",
        },
      ],
      { status: "waiting", lastReadByAdminAt: "2026-08-13T11:00:00.000Z" },
    );
    expect(out[0]?.delivery).toBe("read");
    expect(out[1]?.delivery).toBe("sent");
  });

  it("keeps a single tick on sent customer messages until admin reads", () => {
    const out = applyDeliveryReceipts(
      [{ senderType: "customer", createdAt: "2026-08-13T10:00:00.000Z" }],
      { status: "waiting" },
    );
    expect(out[0]?.delivery).toBe("sent");
  });

  it("compares MySQL DATETIME watermarks with ISO createdAt", () => {
    const out = applyDeliveryReceipts(
      [
        {
          senderType: "customer",
          createdAt: "2026-08-14T14:08:00.000Z",
        },
        {
          senderType: "customer",
          createdAt: "2026-08-14T14:20:00.000Z",
        },
      ],
      { status: "waiting", lastReadByAdminAt: "2026-08-14 14:10:00" },
    );
    expect(out[0]?.delivery).toBe("read");
    expect(out[1]?.delivery).toBe("sent");
  });

  it("marks admin messages read after customer watermark", () => {
    const out = applyDeliveryReceipts(
      [
        {
          senderType: "admin",
          createdAt: "2026-08-13T10:00:00.000Z",
        },
      ],
      {
        status: "pending",
        lastReadByCustomerAt: "2026-08-13T10:30:00.000Z",
      },
    );
    expect(out[0]?.delivery).toBe("read");
  });

  it("preserves sending/failed delivery", () => {
    const out = applyDeliveryReceipts(
      [{ senderType: "customer", createdAt: "2026-08-13T10:00:00.000Z", delivery: "sending" }],
      { status: "waiting", lastReadByAdminAt: "2026-08-13T11:00:00.000Z" },
    );
    expect(out[0]?.delivery).toBe("sending");
  });
});

describe("countUnreadStaffMessages", () => {
  it("ignores waiting tickets without a read cursor", () => {
    expect(
      countUnreadStaffMessages({
        status: "waiting",
        lastReadByCustomerAt: null,
        messages: [
          {
            senderType: "admin",
            createdAt: "2026-08-13T10:00:00.000Z",
          },
        ],
      }),
    ).toBe(0);
  });

  it("counts admin replies on pending tickets", () => {
    expect(
      countUnreadStaffMessages({
        status: "pending",
        lastReadByCustomerAt: null,
        messages: [
          { senderType: "system", createdAt: "2026-08-13T09:00:00.000Z" },
          { senderType: "customer", createdAt: "2026-08-13T09:01:00.000Z" },
          { senderType: "admin", createdAt: "2026-08-13T10:00:00.000Z" },
          { senderType: "admin", createdAt: "2026-08-13T10:05:00.000Z" },
        ],
      }),
    ).toBe(2);
  });

  it("only counts messages after the customer watermark", () => {
    expect(
      countUnreadStaffMessages({
        status: "pending",
        lastReadByCustomerAt: "2026-08-13T10:02:00.000Z",
        messages: [
          { senderType: "admin", createdAt: "2026-08-13T10:00:00.000Z" },
          { senderType: "admin", createdAt: "2026-08-13T10:05:00.000Z" },
        ],
      }),
    ).toBe(1);
  });
});

describe("formatUnreadBadge", () => {
  it("formats fa digits and caps at 9+", () => {
    expect(formatUnreadBadge(0)).toBe("");
    expect(formatUnreadBadge(3)).toBe("۳");
    expect(formatUnreadBadge(12)).toBe("۹+");
  });
});
