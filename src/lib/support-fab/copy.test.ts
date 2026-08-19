import { describe, expect, it } from "vitest";
import {
  DEFAULT_SUPPORT_WIDGET_COPY,
  resolveSupportWidgetCopy,
  widgetGuestGreeting,
  widgetStatusCopy,
  widgetWelcomeLine,
} from "./copy";

describe("resolveSupportWidgetCopy", () => {
  it("falls back to defaults for empty overrides", () => {
    expect(resolveSupportWidgetCopy({})).toEqual(DEFAULT_SUPPORT_WIDGET_COPY);
  });

  it("merges admin overrides and trims", () => {
    const copy = resolveSupportWidgetCopy({
      supportWidgetCopy: {
        statusQueue: "  در صف پاسخگویی  ",
        welcomeLineQueue: "به‌زودی پاسخ می‌دهیم",
      },
    });
    expect(copy.statusQueue).toBe("در صف پاسخگویی");
    expect(copy.welcomeLineQueue).toBe("به‌زودی پاسخ می‌دهیم");
    expect(copy.statusLive).toBe(DEFAULT_SUPPORT_WIDGET_COPY.statusLive);
  });

  it("ignores blank strings and keeps defaults", () => {
    const copy = resolveSupportWidgetCopy({
      supportWidgetCopy: {
        statusQueue: "   ",
      },
    });
    expect(copy.statusQueue).toBe(DEFAULT_SUPPORT_WIDGET_COPY.statusQueue);
  });
});

describe("widget copy pickers", () => {
  const custom = {
    ...DEFAULT_SUPPORT_WIDGET_COPY,
    welcomeLineQueue: "سفارشی صف",
    statusQueue: "سفارشی وضعیت",
    afterHoursGreeting: "سفارشی بعد از ساعت",
  };

  it("picks queue welcome and status when operator offline", () => {
    expect(
      widgetWelcomeLine(custom, { withinHours: true, operatorOnline: false }),
    ).toBe("سفارشی صف");
    expect(
      widgetStatusCopy(custom, {
        withinHours: true,
        operatorOnline: false,
        browserOnline: true,
      }),
    ).toBe("سفارشی وضعیت");
  });

  it("picks after-hours guest greeting", () => {
    expect(
      widgetGuestGreeting(custom, { withinHours: false, operatorOnline: true }),
    ).toBe("سفارشی بعد از ساعت");
  });
});
