"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Storefront } from "@phosphor-icons/react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { hajiasalPath } from "@/lib/paths";

export function SellerLogin() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/seller/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "ورود ناموفق");
        return;
      }
      router.push(hajiasalPath("/seller/dashboard"));
      router.refresh();
    } catch {
      setError("خطا در ارتباط با سرور");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="panel-shell relative flex min-h-[100dvh] items-center justify-center overflow-hidden bg-zinc-950 px-4 py-16"
      dir="rtl"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(180,83,9,0.18),_transparent_55%)]" />
      <div className="relative w-full max-w-md rounded-[12px] border border-white/10 bg-white p-6 shadow-2xl sm:p-8">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-950 text-amber-300">
            <Storefront size={22} weight="fill" />
          </span>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">
              پنل فروشنده
            </h1>
            <p className="text-sm text-zinc-500">حاجی عسل · فروش و موجودی</p>
          </div>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">موبایل</span>
            <input
              dir="ltr"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09121111111"
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/15"
              required
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-zinc-700">رمز عبور</span>
            <input
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 rounded-lg border border-zinc-200 bg-white px-3 text-sm outline-none transition focus:border-amber-700/40 focus:ring-2 focus:ring-amber-700/15"
              required
            />
          </label>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <AdminButton
            type="submit"
            disabled={loading}
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
