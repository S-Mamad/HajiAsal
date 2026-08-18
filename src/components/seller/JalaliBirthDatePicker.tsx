"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  JALALI_MONTH_NAMES,
  currentJalaliYear,
  formatIsoDate,
  gregorianToJalali,
  jalaliMonthLength,
  jalaliToGregorian,
} from "@/lib/jalali";

type JalaliBirthDatePickerProps = {
  value: string; // Gregorian ISO YYYY-MM-DD stored for API
  onChange: (iso: string) => void;
  error?: string;
  className?: string;
};

function parseIso(value: string): { jy: number; jm: number; jd: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const gy = Number(m[1]);
  const gm = Number(m[2]);
  const gd = Number(m[3]);
  if (!gy || !gm || !gd) return null;
  return gregorianToJalali(gy, gm, gd);
}

export function JalaliBirthDatePicker({
  value,
  onChange,
  error,
  className,
}: JalaliBirthDatePickerProps) {
  const nowJy = currentJalaliYear();
  const years = useMemo(() => {
    const list: number[] = [];
    for (let y = nowJy - 18; y >= nowJy - 90; y--) list.push(y);
    return list;
  }, [nowJy]);

  const parsed = useMemo(() => {
    if (!value) return { jy: nowJy - 25, jm: 1, jd: 1 };
    return parseIso(value) ?? { jy: nowJy - 25, jm: 1, jd: 1 };
  }, [value, nowJy]);

  const maxDay = jalaliMonthLength(parsed.jy, parsed.jm);

  const commit = (jy: number, jm: number, jd: number) => {
    const dim = jalaliMonthLength(jy, jm);
    const safeDay = Math.min(jd, dim);
    const g = jalaliToGregorian(jy, jm, safeDay);
    onChange(formatIsoDate(g.gy, g.gm, g.gd));
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      <label className="text-sm font-medium text-secondary">تاریخ تولد</label>
      <div className="grid grid-cols-3 gap-2" dir="rtl">
        <select
          aria-label="روز"
          className={cn(
            "h-11 rounded-xl border bg-surface-elevated px-2 text-sm text-primary",
            error ? "border-red-400" : "border-border",
          )}
          value={parsed.jd}
          onChange={(e) =>
            commit(parsed.jy, parsed.jm, Number(e.target.value))
          }
        >
          {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d}>
              {d.toLocaleString("fa-IR")}
            </option>
          ))}
        </select>
        <select
          aria-label="ماه"
          className={cn(
            "h-11 rounded-xl border bg-surface-elevated px-2 text-sm text-primary",
            error ? "border-red-400" : "border-border",
          )}
          value={parsed.jm}
          onChange={(e) =>
            commit(parsed.jy, Number(e.target.value), parsed.jd)
          }
        >
          {JALALI_MONTH_NAMES.map((name, i) => (
            <option key={name} value={i + 1}>
              {name}
            </option>
          ))}
        </select>
        <select
          aria-label="سال"
          className={cn(
            "h-11 rounded-xl border bg-surface-elevated px-2 text-sm text-primary",
            error ? "border-red-400" : "border-border",
          )}
          value={parsed.jy}
          onChange={(e) =>
            commit(Number(e.target.value), parsed.jm, parsed.jd)
          }
        >
          {years.map((y) => (
            <option key={y} value={y}>
              {y.toLocaleString("fa-IR")}
            </option>
          ))}
        </select>
      </div>
      {error ? <p className="text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
