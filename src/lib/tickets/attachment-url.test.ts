import { describe, expect, it } from "vitest";
import { sanitizeTicketAttachmentUrl } from "./attachment-url";

describe("sanitizeTicketAttachmentUrl", () => {
  it("allows same-origin upload paths", () => {
    expect(
      sanitizeTicketAttachmentUrl("/uploads/tickets/u1/a.jpg"),
    ).toBe("/uploads/tickets/u1/a.jpg");
    expect(
      sanitizeTicketAttachmentUrl("/uploads/seller-tickets/s1/a.pdf"),
    ).toBe("/uploads/seller-tickets/s1/a.pdf");
  });

  it("rejects javascript, data, and protocol-relative URLs", () => {
    expect(sanitizeTicketAttachmentUrl("javascript:alert(1)")).toBeNull();
    expect(sanitizeTicketAttachmentUrl("data:text/html,x")).toBeNull();
    expect(sanitizeTicketAttachmentUrl("//evil.com/x.png")).toBeNull();
    expect(sanitizeTicketAttachmentUrl("https://evil.com/x.png")).toBeNull();
    expect(sanitizeTicketAttachmentUrl("/uploads/seller/../../../.env")).toBeNull();
  });
});
