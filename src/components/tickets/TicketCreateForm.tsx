"use client";

import { useState } from "react";
import { CaretDown } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

type Variant = "storefront" | "admin";

type Props = {
  variant?: Variant;
  submitting?: boolean;
  error?: string;
  onSubmit: (input: {
    subject: string;
    body: string;
    priority: string;
  }) => void | Promise<void>;
  className?: string;
  submitLabel?: string;
};

export function TicketCreateForm({
  variant = "storefront",
  submitting,
  error,
  onSubmit,
  className,
  submitLabel = "ارسال تیکت",
}: Props) {
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState("normal");
  const [showMore, setShowMore] = useState(false);

  const canSubmit =
    !submitting && subject.trim().length >= 3 && body.trim().length >= 3;

  const fieldClass =
    variant === "storefront"
      ? "h-11 w-full rounded-xl border border-border bg-surface-elevated px-3 text-sm text-primary outline-none focus:ring-2 focus:ring-gold/30"
      : "h-11 w-full rounded-lg border border-stone-200 bg-white px-3 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-amber-700/20";

  const labelClass =
    variant === "storefront"
      ? "block space-y-1.5 text-sm"
      : "block space-y-1.5 text-sm";

  const labelText =
    variant === "storefront"
      ? "font-medium text-primary"
      : "font-medium text-zinc-800";

  return (
    <form
      className={cn(
        "space-y-4",
        variant === "storefront"
          ? "rounded-2xl bg-transparent p-0"
          : "rounded-xl border border-stone-200 bg-white p-4",
        className,
      )}
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        void onSubmit({
          subject: subject.trim(),
          body: body.trim(),
          priority,
        });
      }}
    >
      {error ? <p className="text-sm text-rose-600">{error}</p> : null}

      <label className={labelClass}>
        <span className={labelText}>موضوع</span>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={fieldClass}
          placeholder="مثلاً مشکل در سفارش"
          maxLength={200}
          required
        />
      </label>

      <label className={labelClass}>
        <span className={labelText}>متن پیام</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={6}
          className={cn(
            fieldClass,
            "h-auto min-h-32 resize-y py-2.5",
          )}
          placeholder="جزئیات را بنویسید…"
          maxLength={5000}
          required
        />
      </label>

      <button
        type="button"
        className={cn(
          "inline-flex items-center gap-1 text-xs",
          variant === "storefront" ? "text-secondary" : "text-stone-500",
        )}
        onClick={() => setShowMore((v) => !v)}
      >
        <Icon
          icon={CaretDown}
          size={12}
          className={cn("transition", showMore && "rotate-180")}
        />
        جزئیات بیشتر
      </button>

      {showMore ? (
        <label className={labelClass}>
          <span className={labelText}>اولویت</span>
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className={fieldClass}
          >
            <option value="low">کم</option>
            <option value="normal">عادی</option>
            <option value="high">بالا</option>
          </select>
        </label>
      ) : null}

      <button
        type="submit"
        disabled={!canSubmit}
        className={cn(
          "inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-medium transition disabled:opacity-40 sm:sticky sm:bottom-4",
          variant === "storefront"
            ? "bg-gold text-ink-on-gold hover:brightness-95"
            : "bg-zinc-900 text-white hover:bg-zinc-800",
        )}
      >
        {submitting ? "در حال ارسال…" : submitLabel}
      </button>
    </form>
  );
}
