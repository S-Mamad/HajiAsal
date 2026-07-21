"use client";

import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  tooltip,
  children,
  required,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  tooltip?: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5" htmlFor={htmlFor}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-700">
        {label}
        {required ? <span className="text-red-600">*</span> : null}
        {tooltip ? (
          <span
            title={tooltip}
            className="inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full bg-zinc-200 text-[10px] text-zinc-600"
          >
            ؟
          </span>
        ) : null}
      </span>
      {children}
      {hint && !error ? (
        <span className="text-xs text-zinc-500">{hint}</span>
      ) : null}
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

const controlClass =
  "h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 outline-none transition focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/15 disabled:bg-zinc-50 disabled:text-zinc-400";

export function AdminInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(controlClass, className)} {...props} />;
}

export function AdminTextarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none transition focus:border-amber-700/50 focus:ring-2 focus:ring-amber-700/15",
        className,
      )}
      {...props}
    />
  );
}

export function AdminSelect({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={cn(controlClass, className)} {...props}>
      {children}
    </select>
  );
}
