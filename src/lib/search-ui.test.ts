import { describe, expect, it } from "vitest";
import {
  DEFAULT_SEARCH_UI,
  parseSearchSuggestionLines,
  resolveSearchUi,
} from "@/lib/search-ui";

describe("resolveSearchUi", () => {
  it("falls back to seeded copy when unset", () => {
    const ui = resolveSearchUi({});
    expect(ui.placeholder).toBe(DEFAULT_SEARCH_UI.placeholder);
    expect(ui.suggestionsTitle).toBe(DEFAULT_SEARCH_UI.suggestionsTitle);
    expect(ui.hint).toBe(DEFAULT_SEARCH_UI.hint);
    expect(ui.suggestions).toEqual(DEFAULT_SEARCH_UI.suggestions);
  });

  it("uses admin copy and trims duplicate suggestions", () => {
    const ui = resolveSearchUi({
      searchUi: {
        placeholder: "  عسل گون  ",
        suggestionsTitle: "جستجوهای محبوب",
        hint: "چیزی بنویسید",
        suggestions: ["عسل", "عسل", "  ", "ژل رویال", 12 as unknown as string],
      },
    });
    expect(ui.placeholder).toBe("عسل گون");
    expect(ui.suggestionsTitle).toBe("جستجوهای محبوب");
    expect(ui.hint).toBe("چیزی بنویسید");
    expect(ui.suggestions).toEqual(["عسل", "ژل رویال"]);
  });

  it("allows an empty hint so the footer copy can be hidden", () => {
    const ui = resolveSearchUi({
      searchUi: { hint: "   " },
    });
    expect(ui.hint).toBe("");
  });

  it("keeps an explicit empty suggestions list instead of falling back", () => {
    const ui = resolveSearchUi({
      searchUi: { suggestions: [] },
    });
    expect(ui.suggestions).toEqual([]);
  });
});

describe("parseSearchSuggestionLines", () => {
  it("splits one term per line", () => {
    expect(parseSearchSuggestionLines("عسل\nآویشن\nعسل\n")).toEqual([
      "عسل",
      "آویشن",
    ]);
  });
});
