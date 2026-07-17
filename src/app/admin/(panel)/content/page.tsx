"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import type { SiteConfig } from "@/types";
import { hajiasalPath } from "@/lib/paths";

export default function AdminContentPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadContent = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/content");
      if (res.status === 401) {
        router.push(hajiasalPath("/admin"));
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری");
      setSettings(data.settings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطای ناشناخته");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void loadContent();
  }, [loadContent]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: settings.hero,
          brand: settings.brand,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      setSettings(data.settings);
      setSuccess("ذخیره شد");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setSaving(false);
    }
  };

  if (!settings && !loading) {
    return <p className="text-sm text-slate-500">محتوایی یافت نشد</p>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <p className="text-sm text-slate-500">
        ویرایش محتوای صفحه اصلی (عنوان، تبلیغ، برند)
      </p>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}
      {success ? <p className="text-sm text-green-600">{success}</p> : null}
      {loading ? <p className="text-sm text-slate-500">در حال بارگذاری...</p> : null}

      {settings ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <Input
            label="عنوان هیرو"
            value={settings.hero.title}
            onChange={(e) =>
              setSettings({
                ...settings,
                hero: { ...settings.hero, title: e.target.value },
              })
            }
          />
          <label className="block text-sm">
            <span className="mb-1 block text-slate-600">زیرعنوان هیرو</span>
            <textarea
              value={settings.hero.subtitle}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  hero: { ...settings.hero, subtitle: e.target.value },
                })
              }
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 outline-none focus:border-slate-400"
            />
          </label>
          <Input
            label="متن دکمه هیرو"
            value={settings.hero.cta}
            onChange={(e) =>
              setSettings({
                ...settings,
                hero: { ...settings.hero, cta: e.target.value },
              })
            }
          />
          <Input
            label="شعار برند"
            value={settings.brand.tagline}
            onChange={(e) =>
              setSettings({
                ...settings,
                brand: { ...settings.brand, tagline: e.target.value },
              })
            }
          />
          <AdminButton type="button" onClick={() => void save()} disabled={saving}>
            {saving ? "در حال ذخیره..." : "ذخیره تغییرات"}
          </AdminButton>
        </div>
      ) : null}
    </div>
  );
}
