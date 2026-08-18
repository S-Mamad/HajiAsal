import { describe, expect, it } from "vitest";
import { isAccountTicketChatPath } from "./ticket-chat-path";

describe("isAccountTicketChatPath", () => {
  it("matches new + thread routes only", () => {
    expect(isAccountTicketChatPath("/account/tickets/new")).toBe(true);
    expect(isAccountTicketChatPath("/account/tickets/abc-123")).toBe(true);
    expect(isAccountTicketChatPath("/account/tickets")).toBe(false);
    expect(isAccountTicketChatPath("/account")).toBe(false);
    expect(isAccountTicketChatPath("/account/tickets/new/extra")).toBe(false);
  });
});
