"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle, WarningCircle, Info, Warning } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface ToastApi {
  push: (input: {
    title: string;
    description?: string;
    tone?: ToastTone;
  }) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

const TONE_ICON = {
  success: CheckCircle,
  error: WarningCircle,
  warning: Warning,
  info: Info,
} as const;

const TONE_STYLE: Record<ToastTone, { icon: string; bar: string }> = {
  success: {
    icon: "bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-600",
  },
  error: {
    icon: "bg-red-50 text-red-700",
    bar: "bg-red-600",
  },
  warning: {
    icon: "bg-amber-50 text-amber-800",
    bar: "bg-amber-600",
  },
  info: {
    icon: "bg-sky-50 text-sky-700",
    bar: "bg-sky-600",
  },
};

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (input: { title: string; description?: string; tone?: ToastTone }) => {
      const id = crypto.randomUUID();
      setItems((prev) => [
        ...prev,
        {
          id,
          title: input.title,
          description: input.description,
          tone: input.tone ?? "info",
        },
      ]);
      window.setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const api = useMemo<ToastApi>(
    () => ({
      push,
      success: (title, description) =>
        push({ title, description, tone: "success" }),
      error: (title, description) =>
        push({ title, description, tone: "error" }),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 top-3 z-[110] flex flex-col items-stretch gap-2 sm:inset-x-auto sm:end-4 sm:top-4 sm:w-[min(100%-2rem,22rem)]">
        {items.map((item) => {
          const Icon = TONE_ICON[item.tone];
          const style = TONE_STYLE[item.tone];
          return (
            <div
              key={item.id}
              className="panel-toast-in pointer-events-auto relative overflow-hidden rounded-[var(--panel-radius)] border border-[var(--panel-border)] bg-[var(--panel-surface)] shadow-[0_18px_40px_-24px_rgba(24,24,27,0.45)]"
              role="status"
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-y-0 start-0 w-0.5",
                  style.bar,
                )}
              />
              <div className="flex gap-3 p-3 ps-3.5">
                <span
                  className={cn(
                    "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--panel-radius-sm)]",
                    style.icon,
                  )}
                >
                  <Icon size={16} weight="fill" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--panel-text)]">
                    {item.title}
                  </p>
                  {item.description ? (
                    <p className="mt-0.5 text-xs leading-relaxed text-[var(--panel-muted)]">
                      {item.description}
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(item.id)}
                  className="shrink-0 rounded-[var(--panel-radius-sm)] p-1 text-[var(--panel-faint)] transition hover:bg-zinc-100 hover:text-[var(--panel-text)]"
                  aria-label="بستن"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}
