const STORAGE_KEY = "hajiasal_device_id";
const COOKIE_NAME = "hajiasal_did";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidDeviceId(value: string | null | undefined): boolean {
  if (!value) return false;
  return UUID_RE.test(value.trim()) && value.trim().length <= 64;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(`(?:^|; )${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]*)`),
  );
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function writeCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  const maxAge = 60 * 60 * 24 * 400; // ~13 months
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
}

/** Stable anonymous device id for OTP rate limits (browser). */
export function getOrCreateDeviceId(): string {
  if (typeof window === "undefined") return "server";

  try {
    const fromStore = localStorage.getItem(STORAGE_KEY);
    if (isValidDeviceId(fromStore)) {
      writeCookie(COOKIE_NAME, fromStore!);
      return fromStore!.trim();
    }
  } catch {
    /* private mode */
  }

  const fromCookie = readCookie(COOKIE_NAME);
  if (isValidDeviceId(fromCookie)) {
    try {
      localStorage.setItem(STORAGE_KEY, fromCookie!);
    } catch {
      /* ignore */
    }
    return fromCookie!.trim();
  }

  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `d-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  writeCookie(COOKIE_NAME, id);
  return id;
}

export function parseDeviceIdFromRequest(
  request: Request,
  bodyDeviceId?: unknown,
): string {
  const fromBody =
    typeof bodyDeviceId === "string" ? bodyDeviceId.trim() : "";
  if (isValidDeviceId(fromBody)) return fromBody;

  const header = request.headers.get("x-device-id")?.trim() ?? "";
  if (isValidDeviceId(header)) return header;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(
    new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`),
  );
  if (match?.[1]) {
    try {
      const decoded = decodeURIComponent(match[1]).trim();
      if (isValidDeviceId(decoded)) return decoded;
    } catch {
      /* ignore */
    }
  }

  return "unknown";
}
