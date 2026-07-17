"use client";

import {
  useRef,
  type KeyboardEvent,
  type ClipboardEvent,
} from "react";
import { cn } from "@/lib/utils";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  error?: string;
}

export function OtpInput({
  value,
  onChange,
  length = 4,
  disabled = false,
  error,
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  const updateAt = (index: number, char: string) => {
    const next = [...digits.map((d) => (d === " " ? "" : d))];
    next[index] = char;
    onChange(next.join("").slice(0, length));
  };

  const handleChange = (index: number, raw: string) => {
    const char = raw.replace(/\D/g, "").slice(-1);
    if (!char) return;
    updateAt(index, char);
    if (index < length - 1) inputsRef.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      const current = digits[index]?.trim() ?? "";
      if (current) {
        updateAt(index, "");
      } else if (index > 0) {
        updateAt(index - 1, "");
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIndex = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIndex]?.focus();
  };

  return (
    <div>
      <div className="flex justify-center gap-3" dir="ltr">
        {Array.from({ length }).map((_, i) => (
          <input
            key={i}
            ref={(el) => {
              inputsRef.current[i] = el;
            }}
            type="text"
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            disabled={disabled}
            value={digits[i]?.trim() ?? ""}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            aria-label={`رقم ${i + 1}`}
            aria-invalid={Boolean(error)}
            className={cn(
              "h-14 w-12 rounded-xl border border-border bg-surface-elevated text-center text-xl font-bold text-primary",
              "focus:border-gold focus:outline-none focus:ring-2 focus:ring-gold/20",
              error && "border-red-400",
            )}
          />
        ))}
      </div>
      {error ? <p className="mt-2 text-center text-xs text-red-500">{error}</p> : null}
    </div>
  );
}
