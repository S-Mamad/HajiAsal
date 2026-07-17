"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";

export function ProfilePageClient() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [newsletter, setNewsletter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/account/profile")
      .then((r) => r.json())
      .then((data) => {
        if (data.user) {
          setFullName(data.user.fullName ?? "");
          setEmail(data.user.email ?? "");
          setPhone(data.user.phone ?? "");
          setNewsletter(data.user.newsletterOptIn ?? false);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, newsletterOptIn: newsletter }),
      });
      const data = await res.json();
      setMessage(res.ok ? "ذخیره شد" : data.error ?? "خطا");
    } catch {
      setMessage("خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-muted">در حال بارگذاری...</p>;
  }

  return (
    <div>
      <SectionHeading title="پروفایل" className="mb-8" />
      <form onSubmit={onSave} className="flex max-w-md flex-col gap-4">
        <Input label="نام" value={fullName} onChange={(e) => setFullName(e.target.value)} />
        <Input label="موبایل" value={phone} dir="ltr" disabled />
        <Input
          label="ایمیل"
          type="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input
            type="checkbox"
            checked={newsletter}
            onChange={(e) => setNewsletter(e.target.checked)}
            className="accent-amber"
          />
          دریافت خبرنامه
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
        </Button>
        {message ? <p className="text-sm text-amber">{message}</p> : null}
      </form>
    </div>
  );
}
