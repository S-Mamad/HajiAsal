"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Phone,
  Envelope,
  MapPin,
  WhatsappLogo,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";

const siteData = site as SiteConfig;

const schema = z.object({
  name: z.string().min(2, "نام الزامی است"),
  email: z.string().email("ایمیل نامعتبر"),
  phone: z.string().min(11, "شماره موبایل نامعتبر"),
  subject: z.string().min(3, "موضوع الزامی است"),
  message: z.string().min(10, "پیام حداقل ۱۰ کاراکتر"),
});

type FormData = z.infer<typeof schema>;

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [msg, setMsg] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.success) {
        setStatus("done");
        setMsg(result.message);
        reset();
      } else {
        setStatus("error");
        setMsg(result.message);
      }
    } catch {
      setStatus("error");
      setMsg("خطا در ارسال پیام");
    }
  };

  const contactCards = [
    {
      icon: Phone,
      label: "موبایل",
      value: siteData.footer.phone,
      href: `tel:${siteData.footer.phone.replace(/\s/g, "")}`,
      dir: "ltr" as const,
    },
    {
      icon: Envelope,
      label: "ایمیل",
      value: siteData.footer.email,
      href: `mailto:${siteData.footer.email}`,
    },
    {
      icon: MapPin,
      label: "آدرس",
      value: siteData.footer.address,
    },
    ...(siteData.social?.whatsapp
      ? [
          {
            icon: WhatsappLogo,
            label: "واتساپ",
            value: "پیام در واتساپ",
            href: siteData.social.whatsapp,
            external: true,
          },
        ]
      : []),
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 md:px-8 md:py-24">
      <Reveal>
        <SectionHeading
          title="تماس با ما"
          subtitle="سؤال، پیشنهاد یا درخواست مشاوره. پاسخگوی شما هستیم"
          className="mb-10 md:mb-14"
        />
      </Reveal>

      <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
        <Reveal>
          <div className="flex flex-col gap-3">
            {contactCards.map((card) => {
              const Icon = card.icon;
              const inner = (
                <>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10 text-gold">
                    <Icon size={18} weight="duotone" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] tracking-wide text-dim">
                      {card.label}
                    </span>
                    <span
                      className="mt-0.5 block text-sm leading-relaxed text-primary"
                      dir={"dir" in card ? card.dir : undefined}
                    >
                      {card.value}
                    </span>
                  </span>
                </>
              );

              if ("href" in card && card.href) {
                return (
                  <a
                    key={card.label}
                    href={card.href}
                    target={"external" in card && card.external ? "_blank" : undefined}
                    rel={
                      "external" in card && card.external
                        ? "noopener noreferrer"
                        : undefined
                    }
                    className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4 transition-colors hover:border-gold/30"
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <div
                  key={card.label}
                  className="flex items-start gap-3 rounded-2xl border border-border bg-surface px-4 py-4"
                >
                  {inner}
                </div>
              );
            })}
          </div>
        </Reveal>

        <Reveal delay={0.08}>
          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 md:p-8"
          >
            <Input
              label="نام"
              {...register("name")}
              error={errors.name?.message}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="ایمیل"
                {...register("email")}
                error={errors.email?.message}
              />
              <Input
                label="موبایل"
                dir="ltr"
                {...register("phone")}
                error={errors.phone?.message}
              />
            </div>
            <Input
              label="موضوع"
              {...register("subject")}
              error={errors.subject?.message}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-secondary">پیام</label>
              <textarea
                {...register("message")}
                rows={5}
                className="rounded-xl border border-border bg-surface-elevated px-4 py-3 text-sm text-primary focus:border-gold/50 focus:outline-none focus:ring-1 focus:ring-gold/30"
              />
              {errors.message ? (
                <p className="text-xs text-red-400">{errors.message.message}</p>
              ) : null}
            </div>
            <Button type="submit" disabled={status === "loading"}>
              {status === "loading" ? "در حال ارسال..." : "ارسال پیام"}
            </Button>
            {msg ? (
              <p
                className={`text-sm ${status === "done" ? "text-gold" : "text-red-400"}`}
              >
                {msg}
              </p>
            ) : null}
          </form>
        </Reveal>
      </div>
    </div>
  );
}
