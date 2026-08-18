/**
 * Minimal Jalali (Persian) calendar helpers — no external dependency.
 */

function div(a: number, b: number) {
  return Math.floor(a / b);
}

function mod(a: number, b: number) {
  return a - b * Math.floor(a / b);
}

export function gregorianToJalali(
  gy: number,
  gm: number,
  gd: number,
): { jy: number; jm: number; jd: number } {
  const gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    355666 +
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) +
    gd +
    gdm[gm - 1]!;
  let jy = -1595 + 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return { jy, jm, jd };
}

export function jalaliToGregorian(
  jy: number,
  jm: number,
  jd: number,
): { gy: number; gm: number; gd: number } {
  const jy2 = jy + 1595;
  let days =
    -355668 +
    365 * jy2 +
    div(jy2, 33) * 8 +
    div(mod(jy2, 33) + 3, 4) +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  let gy = 400 * div(days, 146097);
  days = mod(days, 146097);
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days = mod(days, 36524);
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days = mod(days, 1461);
  if (days > 365) {
    gy += div(days - 1, 365);
    days = mod(days - 1, 365);
  }
  let gd = days + 1;
  const salA = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 1; gm <= 12 && gd > salA[gm]!; gm++) gd -= salA[gm]!;
  return { gy, gm, gd };
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return mod(jy + 12, 33) % 4 === 1 ? 30 : 29;
}

export function formatIsoDate(gy: number, gm: number, gd: number): string {
  return `${gy}-${String(gm).padStart(2, "0")}-${String(gd).padStart(2, "0")}`;
}

export const JALALI_MONTH_NAMES = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export function currentJalaliYear(now = new Date()): number {
  const { jy } = gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate(),
  );
  return jy;
}
