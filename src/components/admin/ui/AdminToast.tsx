"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { X, CheckCircle, WarningCircle, Info } from "@phosphor-icons/react";
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
      <div className="pointer-events-none fixed bottom-4 start-4 z-[100] flex w-[min(100%-2rem,22rem)] flex-col gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              "pointer-events-auto flex gap-3 rounded-xl border bg-white p-3 shadow-lg",
              item.tone === "success" && "border-emerald-200",
              item.tone === "error" && "border-red-200",
              item.tone === "warning" && "border-amber-200",
              item.tone === "info" && "border-stone-200",
            )}
            role="status"
          >
            <span className="mt-0.5 shrink-0 text-stone-600">
              {item.tone === "success" ? (
                <CheckCircle size={18} className="text-emerald-600" />
              ) : item.tone === "error" ? (
                <WarningCircle size={18} className="text-red-600" />
              ) : (
                <Info size={18} />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-stone-900">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs text-stone-500">
                  {item.description}
                </p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="shrink-0 rounded-lg p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
              aria-label="بستن"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useAdminToast must be used within AdminToastProvider");
  return ctx;
}
