"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, ChatCircle } from "@phosphor-icons/react";
import { TicketComposer } from "@/components/tickets/TicketComposer";
import { Icon } from "@/components/ui/Icon";
import { SupportPresenceDot } from "@/components/support-fab/SupportPresenceDot";
import {
  AFTER_HOURS_GREETING,
  LIVE_GREETING,
} from "@/lib/support-fab/constants";
import { isWithinSupportHours } from "@/lib/support-fab/hours";
import { hajiasalPath } from "@/lib/paths";
import { cn } from "@/lib/utils";

const QUICK_PROMPTS = [
  {
    id: "order",
    label: "پیگیری سفارش",
    body: "سلام، می‌خواهم وضعیت سفارشم را پیگیری کنم.",
  },
  {
    id: "pay",
    label: "مشکل پرداخت",
    body: "سلام، در پرداخت سفارش به مشکل خوردم.",
  },
  {
    id: "product",
    label: "سوال محصول",
    body: "سلام، درباره یکی از محصولات سوال داشتم.",
  },
] as const;

function TicketNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderId = searchParams.get("orderId")?.trim() ?? "";
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  const withinHours = useMemo(() => isWithinSupportHours(), []);
  const greeting = withinHours ? LIVE_GREETING : AFTER_HOURS_GREETING;
  const introCopy = orderId
    ? `درباره سفارش ${orderId} بنویسید؛ اولین پیام گفتگو را باز می‌کند.`
    : "پیامتان را بنویسید؛ بدون فرم موضوع مستقیم به پشتیبانی وصل می‌شوید.";

  const upload = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/account/tickets/upload", {
      method: "POST",
      credentials: "include",
      body: fd,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "آپلود ناموفق");
    const url = data.file?.url as string | undefined;
    if (!url) throw new Error("آدرس فایل دریافت نشد");
    return {
      url,
      name: data.file?.name ?? file.name,
      mimeType: data.file?.mimeType ?? file.type,
    };
  };

  const createTicket = async (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
  }) => {
    setError("");
    setCreating(true);
    try {
      const subject = orderId
        ? `پیگیری سفارش ${orderId}`
        : "گفتگو با پشتیبانی";
      const rawBody = input.body.trim() || "پیوست";
      const body = orderId
        ? `${rawBody}\n\n---\nشناسه سفارش: ${orderId}`
        : rawBody;

      const res = await fetch("/api/account/tickets", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          body,
          priority: "normal",
          meta: {
            source: "account-tickets-new",
            currentUrl:
              typeof window !== "undefined" ? window.location.href : undefined,
            clientMessageId: input.clientMessageId,
            attachmentUrl: input.attachmentUrl,
            attachmentName: input.attachmentName,
            attachmentMime: input.attachmentMime,
          },
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "خطا در ایجاد تیکت",
        );
      }
      const id = data.id as string | undefined;
      if (!id) throw new Error("شناسه گفتگو دریافت نشد");
      router.replace(hajiasalPath(`/account/tickets/${id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
      setCreating(false);
      throw err;
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-surface ticket-chat-canvas">
      <header className="relative z-[2] flex shrink-0 items-center gap-1.5 border-b border-border bg-surface/92 px-1.5 py-1.5 backdrop-blur-xl sm:px-2.5">
        <Link
          href={hajiasalPath("/account/tickets")}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-secondary transition hover:bg-surface-muted hover:text-primary active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/50"
          aria-label="بازگشت به تیکت‌ها"
        >
          <Icon icon={ArrowRight} size={18} />
        </Link>
        <span className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold-dim text-gold">
          <Icon icon={ChatCircle} size={18} weight="regular" />
          <SupportPresenceDot live={withinHours} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14.5px] font-semibold tracking-tight text-primary">
            پشتیبانی حاجی‌عسل
          </p>
          <p className="mt-0.5 truncate text-[11px] font-light leading-none text-secondary">
            {orderId ? `سفارش ${orderId}` : "گفتگوی جدید"}
          </p>
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-4">
        <div className="mx-auto flex max-w-lg flex-col gap-3.5">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-dim text-gold">
              <Icon icon={ChatCircle} size={16} weight="regular" />
            </span>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="rounded-2xl rounded-ss-md border border-border bg-surface px-3.5 py-2.5 text-[15px] leading-[1.5] text-primary shadow-[0_10px_24px_-18px_rgb(28_25_23/0.2)]">
                {greeting}
              </div>
              <p className="px-0.5 text-[12px] leading-5 text-secondary">
                {introCopy}
              </p>
            </div>
          </div>

          {!orderId ? (
            <div className="flex flex-wrap gap-2 ps-10">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  disabled={creating}
                  onClick={() => {
                    void createTicket({
                      body: prompt.body,
                      clientMessageId:
                        typeof crypto !== "undefined" && crypto.randomUUID
                          ? crypto.randomUUID()
                          : `c_${Date.now()}`,
                    });
                  }}
                  className={cn(
                    "rounded-full border border-border bg-surface/90 px-3 py-1.5 text-[12px] text-primary transition",
                    "hover:border-gold/35 hover:bg-gold-dim disabled:opacity-50",
                  )}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          ) : null}

          {error ? (
            <div
              role="alert"
              className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] leading-6 text-rose-800"
            >
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <TicketComposer
        variant="storefront"
        ticketId="new"
        roleKey="customer"
        disabled={creating}
        sending={creating}
        placeholder="پیام خود را بنویسید…"
        compact
        omitBottomSafeArea
        onUpload={upload}
        onSend={createTicket}
      />
    </div>
  );
}

export default function AccountTicketNewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-[12rem] items-center justify-center p-6 text-sm text-secondary">
          در حال بارگذاری…
        </div>
      }
    >
      <TicketNewInner />
    </Suspense>
  );
}
