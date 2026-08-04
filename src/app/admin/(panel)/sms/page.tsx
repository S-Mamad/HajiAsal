"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import {
  AdminInput,
  AdminTextarea,
  FormField,
} from "@/components/admin/ui/AdminForm";
import { useAdminToast } from "@/components/admin/ui/AdminToast";
import { Can } from "@/components/admin/auth/AdminAuthProvider";

type SmsStatus = {
  configured: boolean;
  provider: string;
  maxMessageLength: number;
  note?: string;
};

export default function AdminSmsPage() {
  const toast = useAdminToast();
  const [status, setStatus] = useState<SmsStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sms", { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "خطا در بارگذاری وضعیت");
      setStatus({
        configured: Boolean(data.configured),
        provider: String(data.provider ?? ""),
        maxMessageLength: Number(data.maxMessageLength ?? 500),
        note: typeof data.note === "string" ? data.note : undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const maxLen = status?.maxMessageLength ?? 500;
  const canSubmit =
    phone.trim().length >= 10 &&
    message.trim().length > 0 &&
    message.trim().length <= maxLen &&
    Boolean(status?.configured);

  const send = async () => {
    if (!canSubmit || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ phone: phone.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "ارسال ناموفق بود");
      toast.success("پیامک ارسال شد");
      setMessage("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا";
      setError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-stone-600">
          ارسال دستی پیامک به یک شماره. پیامک خودکار وضعیت سفارش فعلاً خاموش
          است؛ ورود با OTP همچنان فعال است.
        </p>
        {status?.note ? (
          <p className="text-xs text-stone-500">{status.note}</p>
        ) : null}
      </div>

      {loadingStatus ? (
        <p className="text-sm text-stone-500">در حال بررسی پیکربندی...</p>
      ) : (
        <div
          className={`rounded-lg border px-3 py-2 text-sm ${
            status?.configured
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : "border-amber-200 bg-amber-50 text-amber-950"
          }`}
        >
          {status?.configured
            ? `کانال آماده است (ارائه‌دهنده: ${status.provider})`
            : "کانال پیامک آزاد پیکربندی نشده. MELIPAYAMAK_SMS_URL یا SMS_API_KEY و SMS_SENDER را در env تنظیم کنید."}
        </div>
      )}

      <Can permission="sms.send">
        <div className="space-y-4 rounded-xl border border-stone-200 bg-white p-4">
          <FormField
            label="شماره موبایل"
            htmlFor="admin-sms-phone"
            required
            hint="فرمت ایرانی، مثلاً ۰۹۱۲۱۲۳۴۵۶۷"
          >
            <AdminInput
              id="admin-sms-phone"
              dir="ltr"
              inputMode="tel"
              placeholder="09121234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={sending}
            />
          </FormField>

          <FormField
            label="متن پیام"
            htmlFor="admin-sms-message"
            required
            hint={`${message.trim().length.toLocaleString("fa-IR")} / ${maxLen.toLocaleString("fa-IR")} کاراکتر`}
          >
            <AdminTextarea
              id="admin-sms-message"
              value={message}
              maxLength={maxLen}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending}
              placeholder="متن پیامک..."
            />
          </FormField>

          {error ? <p className="text-sm text-red-600">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <AdminButton
              type="button"
              variant="outline"
              disabled={sending}
              onClick={() => void loadStatus()}
            >
              بروزرسانی وضعیت
            </AdminButton>
            <AdminButton
              type="button"
              disabled={!canSubmit || sending}
              onClick={() => void send()}
            >
              {sending ? "در حال ارسال..." : "ارسال پیامک"}
            </AdminButton>
          </div>
        </div>
      </Can>
    </div>
  );
}
