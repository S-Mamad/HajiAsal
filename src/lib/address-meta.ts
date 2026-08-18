/** Encode/decode optional geo+receiver fields into address label for DB compat. */

const PREFIX = "__ha1:";
/** MySQL `user_addresses.label` is VARCHAR(120). */
export const ADDRESS_LABEL_MAX = 120;

export type AddressMeta = {
  displayLabel?: string | null;
  lat?: number | null;
  lng?: number | null;
  plaque?: string | null;
  unit?: string | null;
  receiverName?: string | null;
  receiverPhone?: string | null;
};

function compactCoord(n: number | null): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 1e5) / 1e5;
}

function packLabel(payload: {
  l: string | null;
  lat: number | null;
  lng: number | null;
  p: string | null;
  u: string | null;
  rn: string | null;
  rp: string | null;
}): string {
  return `${PREFIX}${JSON.stringify(payload)}`;
}

export function encodeAddressLabel(meta: AddressMeta): string | null {
  const payload = {
    l: meta.displayLabel ?? null,
    lat: compactCoord(meta.lat ?? null),
    lng: compactCoord(meta.lng ?? null),
    p: meta.plaque ?? null,
    u: meta.unit ?? null,
    rn: meta.receiverName ?? null,
    rp: meta.receiverPhone ?? null,
  };
  const hasExtra =
    payload.lat != null ||
    payload.lng != null ||
    payload.p ||
    payload.u ||
    payload.rn ||
    payload.rp;
  if (!hasExtra && !payload.l) return null;
  if (!hasExtra) {
    const plain = payload.l ?? "";
    return plain.length > ADDRESS_LABEL_MAX
      ? plain.slice(0, ADDRESS_LABEL_MAX)
      : plain;
  }

  let encoded = packLabel(payload);
  if (encoded.length <= ADDRESS_LABEL_MAX) return encoded;

  payload.l = null;
  encoded = packLabel(payload);
  if (encoded.length <= ADDRESS_LABEL_MAX) return encoded;

  while (payload.rn && packLabel(payload).length > ADDRESS_LABEL_MAX) {
    payload.rn = payload.rn.slice(0, -1);
  }
  encoded = packLabel(payload);
  if (encoded.length <= ADDRESS_LABEL_MAX) return encoded;

  payload.rn = null;
  payload.p = payload.p ? payload.p.slice(0, 8) : null;
  payload.u = payload.u ? payload.u.slice(0, 8) : null;
  encoded = packLabel(payload);
  if (encoded.length <= ADDRESS_LABEL_MAX) return encoded;

  return packLabel({
    l: null,
    lat: payload.lat,
    lng: payload.lng,
    p: null,
    u: null,
    rn: null,
    rp: payload.rp,
  });
}

export function decodeAddressLabel(label: string | null | undefined): AddressMeta & {
  displayLabel: string | null;
} {
  if (!label) return { displayLabel: null };
  if (!label.startsWith(PREFIX)) {
    return { displayLabel: label };
  }
  try {
    const raw = JSON.parse(label.slice(PREFIX.length)) as {
      l?: string | null;
      lat?: number | null;
      lng?: number | null;
      p?: string | null;
      u?: string | null;
      rn?: string | null;
      rp?: string | null;
    };
    return {
      displayLabel: raw.l ?? null,
      lat: raw.lat ?? null,
      lng: raw.lng ?? null,
      plaque: raw.p ?? null,
      unit: raw.u ?? null,
      receiverName: raw.rn ?? null,
      receiverPhone: raw.rp ?? null,
    };
  } catch {
    return { displayLabel: label };
  }
}

export function formatAddressLine(parts: {
  street: string;
  plaque?: string | null;
  unit?: string | null;
}): string {
  const bits = [parts.street.trim()];
  if (parts.plaque?.trim()) bits.push(`پلاک ${parts.plaque.trim()}`);
  if (parts.unit?.trim()) bits.push(`واحد ${parts.unit.trim()}`);
  return bits.join("، ");
}
