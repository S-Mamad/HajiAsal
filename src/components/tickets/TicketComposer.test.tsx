/** @vitest-environment jsdom */
import { afterEach, describe, expect, it, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { TicketComposer } from "./TicketComposer";

afterEach(() => {
  cleanup();
});

describe("TicketComposer storefront bar", () => {
  it("keeps send on the right in RTL with a minimal bar", () => {
    render(
      <TicketComposer
        variant="storefront"
        compact
        onSend={() => undefined}
        onUpload={async () => ({ url: "/x.jpg" })}
      />,
    );

    const fileInput = screen.getByLabelText("پیوست فایل");
    const send = screen.getByRole("button", { name: "ارسال پیام" });
    const field = screen.getByLabelText("متن پیام");
    const row = fileInput.closest(".ticket-composer-bar");
    const attachLabel = row?.querySelector(`label[for="${fileInput.id}"]`);

    expect(row).not.toHaveAttribute("dir", "ltr");
    expect(row?.className).toContain("rounded-[1.125rem]");
    expect(attachLabel?.className).toContain("h-8");
    expect(send.className).toContain("h-8");
    expect(field.className).toContain("min-h-8");
    expect(fileInput).toHaveClass("sr-only");

    const buttons = row?.querySelectorAll("button") ?? [];
    expect(buttons[0]).toBe(send);
    expect(attachLabel).toBe(row?.lastElementChild);
    expect(
      screen.queryByText(/Enter ارسال/),
    ).not.toBeInTheDocument();
  });

  it("opens file picker via label and uploads attachment", async () => {
    const upload = vi.fn(async () => ({
      url: "/uploads/test.jpg",
      name: "test.jpg",
      mimeType: "image/jpeg",
    }));

    render(
      <TicketComposer
        variant="storefront"
        compact
        onSend={() => undefined}
        onUpload={upload}
      />,
    );

    const fileInput = screen.getByLabelText("پیوست فایل");
    const file = new File(["x"], "test.jpg", { type: "image/jpeg" });
    Object.defineProperty(fileInput, "value", {
      writable: true,
      value: "",
    });

    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
    });
    expect(await screen.findByText("test.jpg")).toBeInTheDocument();
  });
});
