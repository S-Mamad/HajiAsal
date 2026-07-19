"use client";

import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

/** Email login is not enabled yet — keep UI honest without calling 501. */
export function EmailLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <p className="rounded-xl border border-border bg-surface-elevated px-3 py-2 text-sm text-secondary">
        ورود با ایمیل به‌زودی فعال می‌شود. فعلاً از تب موبایل استفاده کنید.
      </p>
      <Input
        label="ایمیل"
        type="email"
        dir="ltr"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled
      />
      <Input
        label="رمز عبور"
        type="password"
        dir="ltr"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled
      />
      <Button type="submit" disabled className="w-full">
        ورود با ایمیل (به‌زودی)
      </Button>
    </form>
  );
}
