"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash } from "@phosphor-icons/react";
import { AdminAccordion } from "@/components/admin/ui/AdminAccordion";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  AdminInput,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import type {
  SiteConfig,
  SocialLinks,
  TrustPageContent,
} from "@/types";
import { hajiasalPath } from "@/lib/paths";

const SOCIAL_FIELDS: Array<{ key: keyof SocialLinks; label: string }> = [
  { key: "instagram", label: "اینستاگرام" },
  { key: "telegram", label: "تلگرام" },
  { key: "eitaa", label: "ایتا" },
  { key: "rubika", label: "روبیکا" },
  { key: "bale", label: "بله" },
  { key: "soroush", label: "سروش" },
  { key: "supportTelegram", label: "پشتیبانی تلگرام" },
  { key: "supportEitaa", label: "پشتیبانی ایتا" },
];

const TRUST_PAGE_KEYS = [
  { key: "shipping", label: "ارسال و تحویل" },
  { key: "privacy", label: "حریم خصوصی" },
  { key: "terms", label: "قوانین" },
  { key: "authenticity", label: "اصالت کالا" },
] as const;

export default function AdminContentPage() {
  const router = useRouter();
  const toast = useAdminToast();
  const [settings, setSettings] = useState<SiteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero: settings.hero,
          brand: settings.brand,
          brandStory: settings.brandStory,
          aboutPage: settings.aboutPage,
          footer: settings.footer,
          social: settings.social,
          nav: settings.nav,
          faq: settings.faq,
          trustItems: settings.trustItems,
          milestones: settings.milestones,
          trustPages: settings.trustPages,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در ذخیره");
      setSettings(data.settings);
      toast.success("متن‌ها ذخیره شد");
    } catch (err) {
      const message = err instanceof Error ? err.message : "خطا";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const setSocial = (key: keyof SocialLinks, value: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      social: { ...settings.social, [key]: value },
    });
  };

  if (!settings && !loading) {
    return <p className="text-sm text-zinc-500">محتوایی یافت نشد</p>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4 pb-24">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-zinc-500">
            ویرایش متن‌های فروشگاه. HTML و کد ذخیره نمی‌شود؛ فقط متن ساده و لینک
            https.
          </p>
        </div>
        <AdminButton type="button" onClick={() => void save()} disabled={saving || !settings}>
          {saving ? "در حال ذخیره..." : "ذخیره همه"}
        </AdminButton>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {loading ? <p className="text-sm text-zinc-500">در حال بارگذاری...</p> : null}

      {settings ? (
        <>
          <AdminAccordion
            title="هیرو صفحه اصلی"
            description="عنوان، توضیح و دکمه بالای سایت"
            defaultOpen
          >
            <div className="space-y-3">
              <FormField label="عنوان">
                <AdminInput
                  value={settings.hero.title}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, title: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="زیرعنوان">
                <AdminTextarea
                  rows={3}
                  value={settings.hero.subtitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, subtitle: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="متن دکمه">
                <AdminInput
                  value={settings.hero.cta}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, cta: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="آدرس دکمه" hint="مسیر داخلی مثل /shop یا لینک https">
                <AdminInput
                  dir="ltr"
                  value={settings.hero.ctaHref}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      hero: { ...settings.hero, ctaHref: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
          </AdminAccordion>

          <AdminAccordion title="برند" description="نام، شعار و توضیح کوتاه">
            <div className="space-y-3">
              <FormField label="نام برند">
                <AdminInput
                  value={settings.brand.name}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brand: { ...settings.brand, name: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="شعار">
                <AdminInput
                  value={settings.brand.tagline}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brand: { ...settings.brand, tagline: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="توضیح">
                <AdminTextarea
                  rows={3}
                  value={settings.brand.description}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brand: { ...settings.brand, description: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
          </AdminAccordion>

          <AdminAccordion title="منوی سایت" description="برچسب لینک‌های هدر">
            <div className="space-y-3">
              {settings.nav.map((item, index) => (
                <div
                  key={item.id}
                  className="grid gap-3 rounded-lg border border-zinc-200 p-3 sm:grid-cols-2"
                >
                  <FormField label="برچسب">
                    <AdminInput
                      value={item.label}
                      onChange={(e) => {
                        const nav = [...settings.nav];
                        nav[index] = { ...item, label: e.target.value };
                        setSettings({ ...settings, nav });
                      }}
                    />
                  </FormField>
                  <FormField label="آدرس">
                    <AdminInput
                      dir="ltr"
                      value={item.href}
                      onChange={(e) => {
                        const nav = [...settings.nav];
                        nav[index] = { ...item, href: e.target.value };
                        setSettings({ ...settings, nav });
                      }}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </AdminAccordion>

          <AdminAccordion title="داستان برند" description="بخش درباره ما در صفحه اصلی">
            <div className="space-y-3">
              <FormField label="عنوان">
                <AdminInput
                  value={settings.brandStory.title}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      brandStory: {
                        ...settings.brandStory,
                        title: e.target.value,
                      },
                    })
                  }
                />
              </FormField>
              {settings.brandStory.paragraphs.map((paragraph, index) => (
                <FormField key={index} label={`پاراگراف ${(index + 1).toLocaleString("fa-IR")}`}>
                  <AdminTextarea
                    rows={3}
                    value={paragraph}
                    onChange={(e) => {
                      const paragraphs = [...settings.brandStory.paragraphs];
                      paragraphs[index] = e.target.value;
                      setSettings({
                        ...settings,
                        brandStory: { ...settings.brandStory, paragraphs },
                      });
                    }}
                  />
                </FormField>
              ))}
            </div>
          </AdminAccordion>

          <AdminAccordion title="صفحه درباره ما" description="پاراگراف‌های /about">
            <div className="space-y-3">
              {settings.aboutPage.paragraphs.map((paragraph, index) => (
                <FormField key={index} label={`پاراگراف ${(index + 1).toLocaleString("fa-IR")}`}>
                  <AdminTextarea
                    rows={3}
                    value={paragraph}
                    onChange={(e) => {
                      const paragraphs = [...settings.aboutPage.paragraphs];
                      paragraphs[index] = e.target.value;
                      setSettings({
                        ...settings,
                        aboutPage: { paragraphs },
                      });
                    }}
                  />
                </FormField>
              ))}
            </div>
          </AdminAccordion>

          <AdminAccordion title="نوار اعتماد" description="سه ستون زیر هیرو">
            <div className="space-y-3">
              {settings.trustItems.map((item, index) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-zinc-200 p-3"
                >
                  <FormField label="عنوان">
                    <AdminInput
                      value={item.title}
                      onChange={(e) => {
                        const trustItems = [...settings.trustItems];
                        trustItems[index] = { ...item, title: e.target.value };
                        setSettings({ ...settings, trustItems });
                      }}
                    />
                  </FormField>
                  <FormField label="توضیح">
                    <AdminInput
                      value={item.description}
                      onChange={(e) => {
                        const trustItems = [...settings.trustItems];
                        trustItems[index] = {
                          ...item,
                          description: e.target.value,
                        };
                        setSettings({ ...settings, trustItems });
                      }}
                    />
                  </FormField>
                </div>
              ))}
            </div>
          </AdminAccordion>

          <AdminAccordion
            title="سوالات متداول"
            description="متن پرسش و پاسخ صفحه FAQ"
          >
            <div className="space-y-3">
              {(settings.faq ?? []).map((item, index) => (
                <div
                  key={item.id}
                  className="space-y-3 rounded-lg border border-zinc-200 p-3"
                >
                  <div className="flex justify-end">
                    <AdminButton
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setSettings({
                          ...settings,
                          faq: (settings.faq ?? []).filter((_, i) => i !== index),
                        })
                      }
                    >
                      <Trash size={14} />
                      حذف
                    </AdminButton>
                  </div>
                  <FormField label="پرسش">
                    <AdminInput
                      value={item.question}
                      onChange={(e) => {
                        const faq = [...(settings.faq ?? [])];
                        faq[index] = { ...item, question: e.target.value };
                        setSettings({ ...settings, faq });
                      }}
                    />
                  </FormField>
                  <FormField label="پاسخ">
                    <AdminTextarea
                      rows={3}
                      value={item.answer}
                      onChange={(e) => {
                        const faq = [...(settings.faq ?? [])];
                        faq[index] = { ...item, answer: e.target.value };
                        setSettings({ ...settings, faq });
                      }}
                    />
                  </FormField>
                </div>
              ))}
              <AdminButton
                type="button"
                variant="outline"
                onClick={() =>
                  setSettings({
                    ...settings,
                    faq: [
                      ...(settings.faq ?? []),
                      {
                        id: `faq-${Date.now()}`,
                        question: "",
                        answer: "",
                      },
                    ],
                  })
                }
              >
                <Plus size={14} />
                افزودن پرسش
              </AdminButton>
            </div>
          </AdminAccordion>

          <AdminAccordion title="صفحات اعتماد" description="ارسال، حریم خصوصی، قوانین، اصالت">
            <div className="space-y-4">
              {TRUST_PAGE_KEYS.map(({ key, label }) => {
                const page = settings.trustPages?.[key];
                if (!page) return null;
                return (
                  <TrustPageEditor
                    key={key}
                    title={label}
                    page={page}
                    onChange={(next) =>
                      setSettings({
                        ...settings,
                        trustPages: {
                          ...settings.trustPages!,
                          [key]: next,
                        },
                      })
                    }
                  />
                );
              })}
            </div>
          </AdminAccordion>

          <AdminAccordion title="تماس و فوتر">
            <div className="space-y-3">
              <FormField label="شماره تماس">
                <AdminInput
                  dir="ltr"
                  value={settings.footer.phone}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, phone: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="ایمیل">
                <AdminInput
                  dir="ltr"
                  value={settings.footer.email}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, email: e.target.value },
                    })
                  }
                />
              </FormField>
              <FormField label="آدرس">
                <AdminInput
                  value={settings.footer.address}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      footer: { ...settings.footer, address: e.target.value },
                    })
                  }
                />
              </FormField>
            </div>
          </AdminAccordion>

          <AdminAccordion title="شبکه‌های اجتماعی" description="فقط لینک https">
            <div className="space-y-3">
              {SOCIAL_FIELDS.map(({ key, label }) => (
                <FormField key={key} label={label}>
                  <AdminInput
                    dir="ltr"
                    value={settings.social?.[key] ?? ""}
                    onChange={(e) => setSocial(key, e.target.value)}
                  />
                </FormField>
              ))}
            </div>
          </AdminAccordion>

          <div className="sticky bottom-4 z-10 flex justify-end">
            <AdminButton type="button" onClick={() => void save()} disabled={saving}>
              {saving ? "در حال ذخیره..." : "ذخیره همه متن‌ها"}
            </AdminButton>
          </div>
        </>
      ) : null}
    </div>
  );
}

function TrustPageEditor({
  title,
  page,
  onChange,
}: {
  title: string;
  page: TrustPageContent;
  onChange: (page: TrustPageContent) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-zinc-200 p-3">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      <FormField label="عنوان صفحه">
        <AdminInput
          value={page.title}
          onChange={(e) => onChange({ ...page, title: e.target.value })}
        />
      </FormField>
      <FormField label="مقدمه">
        <AdminTextarea
          rows={3}
          value={page.intro}
          onChange={(e) => onChange({ ...page, intro: e.target.value })}
        />
      </FormField>
      {page.sections.map((section, index) => (
        <div key={index} className="space-y-2 rounded-md bg-zinc-50 p-3">
          <FormField label={`سرتیتر بخش ${(index + 1).toLocaleString("fa-IR")}`}>
            <AdminInput
              value={section.heading}
              onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, heading: e.target.value };
                onChange({ ...page, sections });
              }}
            />
          </FormField>
          <FormField label="متن بخش">
            <AdminTextarea
              rows={3}
              value={section.body}
              onChange={(e) => {
                const sections = [...page.sections];
                sections[index] = { ...section, body: e.target.value };
                onChange({ ...page, sections });
              }}
            />
          </FormField>
        </div>
      ))}
    </div>
  );
}
