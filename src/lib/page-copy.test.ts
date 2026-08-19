import { describe, expect, it } from "vitest";
import {
  DEFAULT_PAGE_COPY,
  resolvePageCopy,
  resolveTicketStatusHint,
} from "./page-copy";

describe("resolvePageCopy", () => {
  it("returns defaults when pageCopy is empty", () => {
    expect(resolvePageCopy({ pageCopy: {} })).toEqual(DEFAULT_PAGE_COPY);
  });

  it("merges footer link overrides", () => {
    const copy = resolvePageCopy({
      pageCopy: {
        footer: {
          quickLinks: [{ label: "فروش", href: "/shop" }],
        },
      },
    });
    expect(copy.footer.quickLinks[0]?.label).toBe("فروش");
    expect(copy.footer.legalLinks.length).toBeGreaterThan(0);
  });

  it("resolves ticket status hints", () => {
    const copy = resolvePageCopy({
      pageCopy: {
        tickets: {
          statusHints: { open: "در صف پاسخ" },
        },
      },
    });
    expect(resolveTicketStatusHint(copy, "open")).toBe("در صف پاسخ");
    expect(resolveTicketStatusHint(copy, "waiting")).toBe(
      DEFAULT_PAGE_COPY.tickets.statusHints.waiting,
    );
  });
});
