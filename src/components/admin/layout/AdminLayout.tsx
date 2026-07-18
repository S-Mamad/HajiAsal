"use client";

import { useEffect, useState, type ReactNode } from "react";
import { List, X } from "@phosphor-icons/react";
import { usePathname } from "next/navigation";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { AdminAuthProvider } from "@/components/admin/auth/AdminAuthProvider";
import { AdminToastProvider } from "@/components/admin/ui/AdminToast";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";

interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

function AdminShell({ children, title }: AdminLayoutProps) {
  const [mobileNav, setMobileNav] = useState(false);
  const pathname = usePathname();

  useBodyScrollLock(mobileNav);

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileNav) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileNav(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNav]);

  return (
    <div
      className="admin-shell flex min-h-[100dvh] bg-[#f7f1e8] text-stone-900"
      dir="rtl"
    >
      <div className="hidden lg:flex">
        <AdminSidebar />
      </div>

      {mobileNav ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/50"
            aria-label="بستن منو"
            onClick={() => setMobileNav(false)}
          />
          <div className="absolute inset-y-0 start-0 flex max-w-[85vw] shadow-2xl">
            <div className="relative flex h-full">
              <AdminSidebar onNavigate={() => setMobileNav(false)} />
              <button
                type="button"
                onClick={() => setMobileNav(false)}
                className="absolute end-2 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-lg bg-stone-800 text-stone-200 hover:bg-stone-700"
                aria-label="بستن"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-40 flex items-center gap-2 border-b border-stone-200 bg-[#f7f1e8]/95 px-3 py-2 backdrop-blur lg:hidden">
          <button
            type="button"
            onClick={() => setMobileNav(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-stone-600 hover:bg-white/70 active:bg-white"
            aria-label="منو"
            aria-expanded={mobileNav}
          >
            <List size={20} />
          </button>
          <div className="min-w-0 flex-1">
            <AdminHeader title={title} compact />
          </div>
        </div>
        <div className="hidden lg:block">
          <AdminHeader title={title} />
        </div>
        <main className="flex-1 px-4 py-5 sm:px-6">{children}</main>
      </div>
    </div>
  );
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  return (
    <AdminAuthProvider>
      <AdminToastProvider>
        <AdminShell title={title}>{children}</AdminShell>
      </AdminToastProvider>
    </AdminAuthProvider>
  );
}
