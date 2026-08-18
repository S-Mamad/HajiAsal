import type { SiteConfig } from "@/types";

export type SearchUiSettings = {
  placeholder: string;
  suggestionsTitle: string;
  hint: string;
  suggestions: string[];
};

export const DEFAULT_SEARCH_UI: SearchUiSettings = {
  placeholder: "عسل، ژل رویال، هدیه…",
  suggestionsTitle: "پیشنهادها",
  hint: "نام محصول یا طعم را بنویسید؛ نتایج همان لحظه می‌آید.",
  suggestions: [
    "عسل کوهستان",
    "آویشن",
    "ژل رویال",
    "ست هدیه",
    "شهد",
    "عسل گون",
  ],
};

const MAX_SUGGESTIONS = 16;
const MAX_SUGGESTION_LEN = 40;

function asText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export function normalizeSearchSuggestions(
  value: unknown,
  fallback: string[] = DEFAULT_SEARCH_UI.suggestions,
): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value) {
    if (typeof raw !== "string") continue;
    const term = raw.trim().slice(0, MAX_SUGGESTION_LEN);
    if (!term || seen.has(term)) continue;
    seen.add(term);
    out.push(term);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

export function parseSearchSuggestionLines(raw: string): string[] {
  return normalizeSearchSuggestions(raw.split(/\r?\n/), []);
}

export function resolveSearchUi(
  settings: Partial<SiteConfig> | null | undefined,
): SearchUiSettings {
  const raw = settings?.searchUi;
  return {
    placeholder: asText(
      raw?.placeholder,
      DEFAULT_SEARCH_UI.placeholder,
      80,
    ),
    suggestionsTitle: asText(
      raw?.suggestionsTitle,
      DEFAULT_SEARCH_UI.suggestionsTitle,
      40,
    ),
    hint:
      typeof raw?.hint === "string"
        ? raw.hint.trim().slice(0, 160)
        : DEFAULT_SEARCH_UI.hint,
    suggestions: normalizeSearchSuggestions(raw?.suggestions),
  };
}
