/** @vitest-environment jsdom */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FAB_WELCOME_SEEN_KEY } from "@/lib/support-fab/constants";

const pathname = vi.hoisted(() => ({ current: "/" }));

vi.mock("next/navigation", () => ({
  usePathname: () => pathname.current,
}));

vi.mock("@/lib/ui/haptic", () => ({
  hapticLight: () => undefined,
  hapticPulse: () => undefined,
}));

vi.mock("./playPop", () => ({
  playSupportPop: () => undefined,
}));

vi.mock("next/dynamic", () => ({
  default: () => {
    function MockPanel() {
      return <div>پنل پشتیبانی</div>;
    }
    return MockPanel;
  },
}));

vi.mock("@/lib/support-fab/hours", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/support-fab/hours")>();
  return {
    ...actual,
    isWithinSupportHours: () => true,
  };
});

vi.mock("./SupportFabPanel", () => ({
  default: () => <div>پنل پشتیبانی</div>,
}));

import { SupportFabRoot } from "./SupportFabRoot";

function stubRect() {
  HTMLElement.prototype.getBoundingClientRect = () =>
    ({
      x: 900,
      y: 600,
      top: 600,
      left: 900,
      bottom: 656,
      right: 956,
      width: 56,
      height: 56,
      toJSON: () => ({}),
    }) as DOMRect;
}

describe("SupportFabRoot", () => {
  beforeEach(() => {
    pathname.current = "/";
    sessionStorage.clear();
    stubRect();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }),
    });
    HTMLElement.prototype.setPointerCapture = () => undefined;
    HTMLElement.prototype.releasePointerCapture = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          authenticated: false,
          withinHours: true,
          operatorOnline: true,
          unreadCount: 0,
          openTicketId: null,
        }),
      })),
    );
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("does not mount on login", () => {
    pathname.current = "/login";
    const { container } = render(<SupportFabRoot />);
    expect(container.firstChild).toBeNull();
  });

  it("opens the support dialog on a tap, not a drag", async () => {
    render(<SupportFabRoot />);
    const button = await screen.findByRole("button", { name: /پشتیبانی/ });
    expect(button.getAttribute("aria-label")).toBe("پشتیبانی حاجی‌عسل");
    fireEvent.click(button);
    expect(await screen.findByRole("dialog", { name: /گفتگوی پشتیبانی/ })).toBeTruthy();
    expect(await screen.findByText("پنل پشتیبانی")).toBeTruthy();
  });

  it("stays fixed and does not persist a drag snap", async () => {
    render(<SupportFabRoot />);
    await screen.findByRole("button", { name: /پشتیبانی/ });
    const host = screen.getByTestId("support-fab");
    fireEvent.pointerDown(host, { pointerId: 1, clientX: 920, clientY: 620, buttons: 1 });
    fireEvent.pointerMove(host, { pointerId: 1, clientX: 80, clientY: 580, buttons: 1 });
    fireEvent.pointerUp(host, {
      pointerId: 1,
      button: 0,
      pointerType: "mouse",
      clientX: 80,
      clientY: 580,
    });
    expect(sessionStorage.getItem("hajiasal-support-fab-snap")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("prefetches handshake once per path on hover", async () => {
    render(<SupportFabRoot />);
    const button = await screen.findByRole("button", { name: /پشتیبانی/ });
    fireEvent.mouseEnter(button);
    fireEvent.mouseEnter(button);
    fireEvent.focus(button);
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  it("does not reshow the welcome tooltip after it has been marked seen", async () => {
    sessionStorage.setItem(FAB_WELCOME_SEEN_KEY, "1");
    vi.useFakeTimers();
    render(<SupportFabRoot />);
    await vi.advanceTimersByTimeAsync(12_000);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("hides on scroll down and shows again on scroll up, but stays while open", async () => {
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      cb(0);
      return 1;
    });
    Object.defineProperty(window, "scrollY", { writable: true, value: 0 });
    render(<SupportFabRoot />);
    await screen.findByRole("button", { name: /پشتیبانی/ });
    const host = screen.getByTestId("support-fab");

    window.scrollY = 80;
    fireEvent.scroll(window);
    expect(host.getAttribute("aria-hidden")).toBe("true");

    window.scrollY = 20;
    fireEvent.scroll(window);
    expect(host.getAttribute("aria-hidden")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /پشتیبانی/ }));
    expect(await screen.findByRole("dialog", { name: /گفتگوی پشتیبانی/ })).toBeTruthy();
    window.scrollY = 240;
    fireEvent.scroll(window);
    expect(host.getAttribute("aria-hidden")).toBeNull();
    expect(screen.getByRole("dialog", { name: /گفتگوی پشتیبانی/ })).toBeTruthy();
  });
});
