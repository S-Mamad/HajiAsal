"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";
import { useAuth } from "@/hooks/useAuth";
import { syncWishlistBidirectional } from "@/lib/client/wishlist-sync";
import { safeAuthRedirect } from "@/lib/safe-redirect";

interface RegisterFormProps {
  phone: string;
  onCompleted?: () => void | Promise<void>;
}

export function RegisterForm({ phone, onCompleted }: RegisterFormProps) {
  const router = useRouter();
  const { refresh } = useAuth();
  const searchParams = useSearchParams();
  const redirect = safeAuthRedirect(
    searchParams.get("redirect"),
    hajiasalPath("/account"),
  );

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [newsletter, setNewsletter] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) {
      setError("شماره موبایل مشخص نیست. دوباره وارد شوید.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          phone,
          fullName,
          email: email || undefined,
          newsletterOptIn: newsletter,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message ?? "خطا در ثبت‌نام");
        return;
      }
      await syncWishlistBidirectional();
      await refresh();
      await onCompleted?.();
      if (/^https?:\/\//i.test(redirect)) {
        window.requestAnimationFrame(() => {
          window.location.replace(redirect);
        });
      } else {
        router.replace(redirect);
        router.refresh();
      }
    } catch {
      setError("اتصال برقرار نشد. دوباره تلاش کنید");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Input
        label="نام و نام خانوادگی"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
        required
        autoComplete="name"
        autoFocus
      />
      <Input
        label="ایمیل (اختیاری)"
        type="email"
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
      />
      <label className="flex items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={newsletter}
          onChange={(e) => setNewsletter(e.target.checked)}
          className="accent-amber"
        />
        می‌خواهم از تخفیف‌ها باخبر شوم
      </label>
      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      <Button
        type="submit"
        disabled={loading || fullName.trim().length < 2}
        className="w-full"
      >
        {loading ? "در حال ثبت..." : "ثبت و ادامه"}
      </Button>
    </form>
  );
}
