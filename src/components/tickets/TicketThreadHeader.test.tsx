/** @vitest-environment jsdom */
import { afterEach, describe, expect, it } from "vitest";
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { TicketThreadHeader } from "./TicketThreadHeader";

afterEach(() => {
  cleanup();
});

describe("TicketThreadHeader messenger chrome", () => {
  it("uses a slim support header without status pills", () => {
    render(
      <TicketThreadHeader
        subject="پشتیبانی حاجی‌عسل"
        status="open"
        variant="storefront"
        compact
        minimal
        partyLabel="پیگیری سفارش ۱۲۳"
      />,
    );

    expect(screen.getByText("پشتیبانی حاجی‌عسل")).toBeInTheDocument();
    expect(screen.getByText(/پیگیری سفارش ۱۲۳/)).toBeInTheDocument();
    expect(screen.queryByText("باز")).not.toBeInTheDocument();
  });
});
