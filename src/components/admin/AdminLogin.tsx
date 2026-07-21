"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, FormField } from "@/components/admin/ui/AdminForm";
import { hajiasalPath } from "@/lib/paths";

export function AdminLogin() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          password,
          ...(login.trim() ? { login: login.trim() } : {}),
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message ?? "اطلاعات ورود نادرست است");
        return;
      }

      router.push(hajiasalPath("/admin/dashboard"));
      router.refresh();
    } catch {
      setError("خطا در ورود");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="panel-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-zinc-950 px-4 py-16"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(180,83,9,0.22),_transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-[12px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-amber-400">
            <ShieldCheck size={22} weight="fill" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              پنل مدیریت
            </h1>
            <p className="text-sm text-zinc-500">حاجی عسل · کنترل فروشگاه</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <FormField
            label="ایمیل یا موبایل"
            hint="برای ورود bootstrap می‌توانید خالی بگذارید"
            tooltip="اگر هنوز کاربر ادمین نساخته‌اید، فقط رمز ADMIN_PASSWORD کافی است"
          >
            <AdminInput
              dir="ltr"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
              autoComplete="username"
              placeholder="admin@hajiasal.local"
            />
          </FormField>
          <FormField label="رمز عبور" required>
            <AdminInput
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </FormField>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <AdminButton
            type="submit"
            disabled={loading || !password}
            className="h-11 w-full"
          >
            {loading ? "در حال ورود..." : "ورود به پنل"}
          </AdminButton>
        </form>
        <p className="mt-6 text-center text-xs text-zinc-400">
          <Link href={hajiasalPath("/")} className="hover:text-zinc-600">
            بازگشت به فروشگاه
          </Link>
        </p>
      </div>
    </div>
  );
}
