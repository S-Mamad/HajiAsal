const ONES = [
  "",
  "یک",
  "دو",
  "سه",
  "چهار",
  "پنج",
  "شش",
  "هفت",
  "هشت",
  "نه",
];

const TEENS = [
  "ده",
  "یازده",
  "دوازده",
  "سیزده",
  "چهارده",
  "پانزده",
  "شانزده",
  "هفده",
  "هجده",
  "نوزده",
];

const TENS = [
  "",
  "",
  "بیست",
  "سی",
  "چهل",
  "پنجاه",
  "شصت",
  "هفتاد",
  "هشتاد",
  "نود",
];

const HUNDREDS = [
  "",
  "یکصد",
  "دویست",
  "سیصد",
  "چهارصد",
  "پانصد",
  "ششصد",
  "هفتصد",
  "هشتصد",
  "نهصد",
];

const SCALES = [
  { value: 1_000_000_000, label: "میلیارد" },
  { value: 1_000_000, label: "میلیون" },
  { value: 1_000, label: "هزار" },
] as const;

function threeDigits(n: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds > 0) {
    parts.push(HUNDREDS[hundreds] ?? "");
  }
  if (rest >= 10 && rest < 20) {
    parts.push(TEENS[rest - 10] ?? "");
  } else {
    const tens = Math.floor(rest / 10);
    const ones = rest % 10;
    if (tens > 0) parts.push(TENS[tens] ?? "");
    if (ones > 0) parts.push(ONES[ones] ?? "");
  }
  return parts.filter(Boolean).join(" و ");
}

/** Convert a non-negative integer to Persian words. */
export function numberToPersianWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (!Number.isFinite(n) || n === 0) return "صفر";

  const parts: string[] = [];
  let remaining = n;
  for (const scale of SCALES) {
    const qty = Math.floor(remaining / scale.value);
    if (qty > 0) {
      parts.push(`${threeDigits(qty)} ${scale.label}`);
      remaining %= scale.value;
    }
  }
  if (remaining > 0) {
    parts.push(threeDigits(remaining));
  }
  return parts.join(" و ");
}

/** Invoice line: مبلغ به حروف */
export function tomanAmountInWords(amount: number): string {
  return `${numberToPersianWords(amount)} تومان تمام`;
}
