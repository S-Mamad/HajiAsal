"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body?: string;
  href?: string;
  readAt?: string;
  createdAt: string;
};

export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/seller/notifications");
      if (!res.ok) return;
      const data = (await res.json()) as {
        rows?: Notif[];
        unreadCount?: number;
      };
      setRows(data.rows ?? []);
      setUnread(data.unreadCount ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(t);
  }, [load]);

  const mark = async (payload: { ids?: string[]; all?: boolean }) => {
    await fetch("/api/seller/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    await load();
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          void load();
        }}
        className="relative flex h-10 w-10 items-center justify-center rounded-lg text-stone-600 hover:bg-stone-100"
        aria-label="اعلان‌ها"
      >
        <Icon icon={Bell} size={20} />
        {unread > 0 ? (
          <span className="absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="بستن"
            onClick={() => setOpen(false)}
          />
          <div className="absolute end-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-stone-100 px-3 py-2">
              <span className="text-sm font-semibold">اعلان‌ها</span>
              <button
                type="button"
                className="text-xs text-amber-800 hover:underline"
                onClick={() => void mark({ all: true })}
              >
                همه خوانده شد
              </button>
            </div>
            <ul className="max-h-72 overflow-y-auto">
              {rows.length === 0 ? (
                <li className="px-3 py-8 text-center text-sm text-stone-500">
                  اعلانی نیست
                </li>
              ) : (
                rows.map((n) => (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full flex-col gap-0.5 px-3 py-2.5 text-start hover:bg-stone-50",
                        !n.readAt && "bg-amber-50/50",
                      )}
                      onClick={() => {
                        if (!n.readAt) void mark({ ids: [n.id] });
                        setOpen(false);
                        if (n.href) window.location.href = n.href;
                      }}
                    >
                      <span className="text-sm font-medium text-stone-900">
                        {n.title}
                      </span>
                      {n.body ? (
                        <span className="line-clamp-2 text-xs text-stone-500">
                          {n.body}
                        </span>
                      ) : null}
                    </button>
                  </li>
                ))
              )}
            </ul>
            <Link
              href={hajiasalPath("/seller/notifications")}
              onClick={() => setOpen(false)}
              className="block border-t border-stone-100 px-3 py-2 text-center text-xs font-medium text-amber-900 hover:bg-stone-50"
            >
              مشاهده همه
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
