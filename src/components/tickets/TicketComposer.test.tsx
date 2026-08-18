/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TicketComposer } from "./TicketComposer";

afterEach(() => {
  cleanup();
});

describe("TicketComposer storefront bar", () => {
  it("keeps a native RTL bar with matching 44px actions", () => {
    render(
      <TicketComposer
        variant="storefront"
        compact
        onSend={() => undefined}
        onUpload={async () => ({ url: "/x.jpg" })}
      />,
    );

    const attach = screen.getByRole("button", { name: "پیوست فایل" });
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    const field = screen.getByLabelText("متن پیام");
    const row = attach.parentElement;

    expect(row).not.toHaveAttribute("dir", "ltr");
    expect(attach.className).toContain("h-11");
    expect(send.className).toContain("h-11");
    expect(field.className).toContain("min-h-11");
    expect(
      screen.queryByText(/Enter ارسال/),
    ).not.toBeInTheDocument();
  });
});
