"use client";

import { Plus, Trash } from "@phosphor-icons/react";
import { AdminAccordion } from "@/components/admin/ui/AdminAccordion";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { AdminInput, AdminTextarea, FormField } from "@/components/admin/ui/AdminForm";
import type { PageCopyLink, PageCopySettings } from "@/lib/page-copy";

type Props = {
  value: PageCopySettings;
  onChange: (next: PageCopySettings) => void;
};

function LinkListEditor({
  title,
  links,
  onChange,
  max = 12,
}: {
  title: string;
  links: PageCopyLink[];
  onChange: (links: PageCopyLink[]) => void;
  max?: number;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-zinc-800">{title}</p>
      {links.map((link, index) => (
        <div
          key={`${link.href}-${index}`}
          className="grid gap-2 rounded-lg border border-zinc-200 p-3 sm:grid-cols-[1fr_1fr_auto]"
        >
          <AdminInput
            value={link.label}
            placeholder="برچسب"
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, label: e.target.value };
              onChange(next);
            }}
          />
          <AdminInput
            dir="ltr"
            value={link.href}
            placeholder="/shop"
            onChange={(e) => {
              const next = [...links];
              next[index] = { ...link, href: e.target.value };
              onChange(next);
            }}
          />
          <AdminButton
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(links.filter((_, i) => i !== index))}
          >
            <Trash size={14} />
          </AdminButton>
        </div>
      ))}
      {links.length < max ? (
        <AdminButton
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onChange([...links, { label: "", href: "/shop" }])
          }
        >
          <Plus size={14} />
          افزودن لینک
        </AdminButton>
      ) : null}
    </div>
  );
}

function patchSection<K extends keyof PageCopySettings>(
  value: PageCopySettings,
  key: K,
  patch: Partial<PageCopySettings[K]>,
): PageCopySettings {
  return {
    ...value,
    [key]: { ...value[key], ...patch },
  };
}

export function PageCopyEditor({ value, onChange }: Props) {
  return (
    <>
      <AdminAccordion title="صفحه اصلی — بخش‌ها" description="پرومو، پرفروش‌ها، دسته‌ها، نظرات">
        <div className="space-y-3">
          {(
            [
              ["promoBadge", "برچسب پرومو"],
              ["promoTitle", "عنوان پرومو"],
              ["promoSubtitle", "زیرعنوان پرومو"],
              ["promoCta", "دکمه پرومو"],
              ["bestsellersTitle", "عنوان پرفروش‌ها"],
              ["bestsellersSubtitle", "زیرعنوان پرفروش‌ها"],
              ["categoriesTitle", "عنوان دسته‌ها"],
              ["categoriesSubtitle", "زیرعنوان دسته‌ها"],
              ["testimonialsEyebrow", "برچسب نظرات"],
              ["testimonialsTitle", "عنوان نظرات"],
              ["brandStoryCta", "دکمه داستان برند"],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <AdminInput
                value={value.home[key]}
                onChange={(e) =>
                  onChange(patchSection(value, "home", { [key]: e.target.value }))
                }
              />
            </FormField>
          ))}
          <FormField label="دکمه دوم هیرو">
            <AdminInput
              value={value.home.heroSecondaryCtaLabel}
              onChange={(e) =>
                onChange(
                  patchSection(value, "home", {
                    heroSecondaryCtaLabel: e.target.value,
                  }),
                )
              }
            />
          </FormField>
          <FormField label="آدرس دکمه دوم هیرو" hint="مثل /reviews">
            <AdminInput
              dir="ltr"
              value={value.home.heroSecondaryCtaHref}
              onChange={(e) =>
                onChange(
                  patchSection(value, "home", {
                    heroSecondaryCtaHref: e.target.value,
                  }),
                )
              }
            />
          </FormField>
        </div>
      </AdminAccordion>

      <AdminAccordion title="FAQ و تماس" description="عنوان صفحات">
        <div className="space-y-3">
          <FormField label="عنوان FAQ">
            <AdminInput
              value={value.faq.title}
              onChange={(e) =>
                onChange(patchSection(value, "faq", { title: e.target.value }))
              }
            />
          </FormField>
          <FormField label="زیرعنوان FAQ">
            <AdminTextarea
              rows={2}
              value={value.faq.subtitle}
              onChange={(e) =>
                onChange(patchSection(value, "faq", { subtitle: e.target.value }))
              }
            />
          </FormField>
          <FormField label="عنوان تماس">
            <AdminInput
              value={value.contact.title}
              onChange={(e) =>
                onChange(
                  patchSection(value, "contact", { title: e.target.value }),
                )
              }
            />
          </FormField>
          <FormField label="زیرعنوان تماس">
            <AdminTextarea
              rows={2}
              value={value.contact.subtitle}
              onChange={(e) =>
                onChange(
                  patchSection(value, "contact", { subtitle: e.target.value }),
                )
              }
            />
          </FormField>
        </div>
      </AdminAccordion>

      <AdminAccordion title="فوتر" description="عناوین ستون‌ها، لینک‌ها و جمله پایین">
        <div className="space-y-4">
          {(
            [
              ["quickLinksTitle", "عنوان دسترسی سریع"],
              ["legalLinksTitle", "عنوان اعتماد و قوانین"],
              ["contactTitle", "عنوان تماس"],
              ["bottomTagline", "جمله پایین دسکتاپ"],
              ["copyrightSuffix", "پسوند کپی‌رایت"],
            ] as const
          ).map(([key, label]) => (
            <FormField key={key} label={label}>
              <AdminInput
                value={value.footer[key]}
                onChange={(e) =>
                  onChange(
                    patchSection(value, "footer", { [key]: e.target.value }),
                  )
                }
              />
            </FormField>
          ))}
          <LinkListEditor
            title="لینک‌های دسترسی سریع (دسکتاپ)"
            links={value.footer.quickLinks}
            onChange={(quickLinks) =>
              onChange(patchSection(value, "footer", { quickLinks }))
            }
          />
          <LinkListEditor
            title="لینک‌های قانونی"
            links={value.footer.legalLinks}
            onChange={(legalLinks) =>
              onChange(patchSection(value, "footer", { legalLinks }))
            }
            max={8}
          />
          <LinkListEditor
            title="لینک‌های موبایل"
            links={value.footer.mobileQuickLinks}
            onChange={(mobileQuickLinks) =>
              onChange(patchSection(value, "footer", { mobileQuickLinks }))
            }
          />
        </div>
      </AdminAccordion>

      <AdminAccordion title="سبد خرید" description="عناوین، دکمه‌ها و برچسب‌های مبلغ">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            Object.entries(value.cart) as Array<
              [keyof PageCopySettings["cart"], string]
            >
          ).map(([key, text]) => (
            <FormField key={key} label={key}>
              <AdminInput
                value={text}
                onChange={(e) =>
                  onChange(
                    patchSection(value, "cart", { [key]: e.target.value }),
                  )
                }
              />
            </FormField>
          ))}
        </div>
      </AdminAccordion>

      <AdminAccordion title="ورود و شبکه‌ها">
        <div className="space-y-3">
          <FormField label="عنوان ورود">
            <AdminInput
              value={value.auth.title}
              onChange={(e) =>
                onChange(patchSection(value, "auth", { title: e.target.value }))
              }
            />
          </FormField>
          <FormField label="زیرعنوان ورود">
            <AdminInput
              value={value.auth.subtitle}
              onChange={(e) =>
                onChange(
                  patchSection(value, "auth", { subtitle: e.target.value }),
                )
              }
            />
          </FormField>
          <FormField label="عنوان شبکه‌های اجتماعی">
            <AdminInput
              value={value.social.heading}
              onChange={(e) =>
                onChange(
                  patchSection(value, "social", { heading: e.target.value }),
                )
              }
            />
          </FormField>
          <FormField label="شناسه نمایشی">
            <AdminInput
              value={value.social.handle}
              onChange={(e) =>
                onChange(
                  patchSection(value, "social", { handle: e.target.value }),
                )
              }
            />
          </FormField>
        </div>
      </AdminAccordion>

      <AdminAccordion title="ویجت پشتیبانی" description="عنوان پنل و موضوعات پرتکرار">
        <div className="space-y-3">
          <FormField label="عنوان پنل">
            <AdminInput
              value={value.support.panelTitle}
              onChange={(e) =>
                onChange(
                  patchSection(value, "support", { panelTitle: e.target.value }),
                )
              }
            />
          </FormField>
          <FormField label="placeholder پیام">
            <AdminInput
              value={value.support.composerPlaceholder}
              onChange={(e) =>
                onChange(
                  patchSection(value, "support", {
                    composerPlaceholder: e.target.value,
                  }),
                )
              }
            />
          </FormField>
          {value.support.quickPrompts.map((prompt, index) => (
            <div
              key={prompt.id}
              className="space-y-2 rounded-lg border border-zinc-200 p-3"
            >
              <FormField label="برچسب">
                <AdminInput
                  value={prompt.label}
                  onChange={(e) => {
                    const quickPrompts = [...value.support.quickPrompts];
                    quickPrompts[index] = { ...prompt, label: e.target.value };
                    onChange(
                      patchSection(value, "support", { quickPrompts }),
                    );
                  }}
                />
              </FormField>
              <FormField label="متن پیام (خالی = فقط فوکوس)">
                <AdminTextarea
                  rows={2}
                  value={prompt.body}
                  onChange={(e) => {
                    const quickPrompts = [...value.support.quickPrompts];
                    quickPrompts[index] = { ...prompt, body: e.target.value };
                    onChange(
                      patchSection(value, "support", { quickPrompts }),
                    );
                  }}
                />
              </FormField>
            </div>
          ))}
        </div>
      </AdminAccordion>

      <AdminAccordion title="وضعیت تیکت‌ها" description="راهنمای کوتاه زیر وضعیت">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            Object.entries(value.tickets.statusHints) as Array<
              [keyof PageCopySettings["tickets"]["statusHints"], string]
            >
          ).map(([key, text]) => (
            <FormField key={key} label={key}>
              <AdminInput
                value={text}
                onChange={(e) =>
                  onChange({
                    ...value,
                    tickets: {
                      statusHints: {
                        ...value.tickets.statusHints,
                        [key]: e.target.value,
                      },
                    },
                  })
                }
              />
            </FormField>
          ))}
        </div>
      </AdminAccordion>
    </>
  );
}
