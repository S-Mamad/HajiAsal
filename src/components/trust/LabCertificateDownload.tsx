"use client";

import Image from "next/image";
import { FileArrowDown } from "@phosphor-icons/react";
import { LAB_CERTIFICATE } from "@/lib/lab-certificate";
import { Reveal } from "@/components/ui/Reveal";

/**
 * فقط روی /authenticity رندر می‌شود؛ تصویر کامل تا کلیک لود نمی‌شود (فقط thumb سبک).
 */
export function LabCertificateDownload() {
  return (
    <Reveal delay={0.18}>
      <aside className="mt-10 border-t border-border pt-8 md:mt-12 md:pt-10">
        <p className="mb-1 text-xs font-medium tracking-wide text-gold/90">
          گزارش آزمایشگاه
        </p>
        <h2 className="mb-2 text-base font-semibold text-primary md:text-lg">
          گواهی اصالت شیمیایی عسل
        </h2>
        <p className="mb-5 max-w-xl text-sm leading-relaxed text-secondary md:text-base">
          {LAB_CERTIFICATE.note} برای مشاهده یا ذخیره گزارش کامل، روی دکمه بزنید؛
          فایل تا آن لحظه دانلود نمی‌شود.
        </p>

        <a
          href={LAB_CERTIFICATE.href}
          target="_blank"
          rel="noopener noreferrer"
          download={LAB_CERTIFICATE.downloadName}
          className="group flex max-w-md items-stretch gap-4 rounded-xl border border-border bg-surface-elevated/40 p-3 transition-colors hover:border-gold/40 hover:bg-surface-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-void"
        >
          <span className="relative h-24 w-[4.5rem] shrink-0 overflow-hidden rounded-lg bg-void">
            <Image
              src={LAB_CERTIFICATE.thumbHref}
              alt="پیش‌نمایش گواهی آزمایشگاه عسل"
              fill
              sizes="72px"
              loading="lazy"
              className="object-cover object-top opacity-90 transition-opacity group-hover:opacity-100"
            />
          </span>
          <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 py-1">
            <span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
              <FileArrowDown
                size={18}
                weight="bold"
                className="shrink-0 text-gold"
              />
              {LAB_CERTIFICATE.label}
            </span>
            <span className="text-xs leading-relaxed text-secondary">
              باز شدن در تب جدید · حدود ۶۰ کیلوبایت
            </span>
          </span>
        </a>
      </aside>
    </Reveal>
  );
}
