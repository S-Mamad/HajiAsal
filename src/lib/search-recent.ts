const RECENT_KEY = "hajiasal.search.recent";

export function readSearchRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is string => typeof x === "string" && x.trim().length > 0)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function pushSearchRecent(term: string) {
  const t = term.trim();
  if (!t || typeof window === "undefined") return;
  try {
    const next = [t, ...readSearchRecent().filter((x) => x !== t)].slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export { RECENT_KEY };
