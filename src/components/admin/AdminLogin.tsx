"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

export function AdminLogin() {
  const router = useRouter();
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
        body: JSON.stringify({ password }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        setError(data.message ?? "رمز عبور نادرست است");
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
    <div className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-slate-950 px-4 py-16">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(148,163,184,0.18),_transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-3xl border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-900 text-white shadow-lg">
            <ShieldCheck size={24} weight="fill" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">پنل مدیریت</h1>
            <p className="text-sm text-slate-500">حاجی عسل · کنترل کامل فروشگاه</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-slate-700">رمز عبور</span>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-12 rounded-xl border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 outline-none transition focus:border-slate-500 focus:bg-white focus:ring-2 focus:ring-slate-200"
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <AdminButton
            type="submit"
            disabled={loading || !password}
            className="h-12 w-full"
          >
            {loading ? "در حال ورود..." : "ورود به پنل"}
          </AdminButton>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href={hajiasalPath("/")} className="hover:text-slate-600">
            بازگشت به فروشگاه
          </Link>
        </p>
      </div>
    </div>
  );
}
