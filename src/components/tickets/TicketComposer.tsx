"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";
import {
  Paperclip,
  PaperPlaneTilt,
  SpinnerGap,
  X,
  NoteBlank,
} from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import { validateChatFile } from "@/lib/tickets/types";
import {
  draftStorageKey,
  type ChatMessage,
  type TicketChatVariant,
} from "./chat-utils";

const MAX_CHARS = 5000;

type Props = {
  variant: TicketChatVariant;
  ticketId?: string;
  roleKey?: string;
  disabled?: boolean;
  sending?: boolean;
  closed?: boolean;
  placeholder?: string;
  allowInternal?: boolean;
  replyTo?: ChatMessage | null;
  onClearReply?: () => void;
  canned?: Array<{ shortcut: string; title: string; body: string }>;
  onTyping?: () => void;
  onSend: (input: {
    body: string;
    attachmentUrl?: string | null;
    attachmentName?: string | null;
    attachmentMime?: string | null;
    clientMessageId: string;
    replyToId?: string | null;
    isInternal?: boolean;
  }) => Promise<void> | void;
  onUpload?: (file: File) => Promise<{
    url: string;
    name?: string;
    mimeType?: string;
  }>;
};

export function TicketComposer({
  variant,
  ticketId,
  roleKey = "user",
  disabled,
  sending,
  closed,
  placeholder = "پیام خود را بنویسید…",
  allowInternal,
  replyTo,
  onClearReply,
  canned = [],
  onTyping,
  onSend,
  onUpload,
}: Props) {
  const [text, setText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [shake, setShake] = useState(false);
  const [internal, setInternal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const draftKey =
    ticketId && roleKey ? draftStorageKey(ticketId, roleKey) : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setText(raw);
    } catch {
      /* ignore */
    }
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey) return;
    try {
      if (text) localStorage.setItem(draftKey, text);
      else localStorage.removeItem(draftKey);
    } catch {
      /* ignore */
    }
  }, [draftKey, text]);

  const locked = disabled || sending || closed || uploading;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [text, resize]);

  const canSend =
    !locked &&
    (text.trim().length > 0 || !!attachmentUrl) &&
    text.length <= MAX_CHARS;

  const processFile = async (file: File) => {
    if (!onUpload) return;
    const check = validateChatFile(file);
    if (!check.ok) {
      setUploadError(check.error);
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const res = await onUpload(file);
      setAttachmentUrl(res.url);
      setAttachmentName(res.name ?? file.name);
      setAttachmentMime(res.mimeType ?? file.type);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "آپلود ناموفق");
    } finally {
      setUploading(false);
    }
  };

  const submit = async () => {
    if (!canSend) return;
    let body = text.trim();
    if (body.startsWith("/") && canned.length) {
      const shortcut = body.split(/\s+/)[0];
      const found = canned.find((c) => c.shortcut === shortcut);
      if (found) body = found.body;
    }
    const payload = {
      body,
      attachmentUrl,
      attachmentName,
      attachmentMime,
      clientMessageId:
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `c_${Date.now()}`,
      replyToId: replyTo?.id ?? null,
      isInternal: internal,
    };
    setText("");
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentMime(null);
    setUploadError("");
    onClearReply?.();
    if (draftKey) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* ignore */
      }
    }
    try {
      await onSend(payload);
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await processFile(file);
  };

  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const item = Array.from(e.clipboardData.items).find((i) =>
      i.type.startsWith("image/"),
    );
    if (!item) return;
    const file = item.getAsFile();
    if (file) {
      e.preventDefault();
      void processFile(file);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void processFile(file);
  };

  if (closed) {
    return (
      <div
        className={cn(
          "border-t px-4 py-3 text-center text-sm",
          variant === "storefront"
            ? "border-border text-secondary"
            : "border-stone-200 text-stone-500",
        )}
      >
        این تیکت بسته شده است. برای ادامه گفتگو آن را دوباره باز کنید.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-t p-3 sm:p-4",
        variant === "storefront" ? "border-border bg-surface" : "border-stone-200 bg-white",
        dragOver && "ring-2 ring-inset ring-amber-400",
      )}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {replyTo ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs">
          <span className="truncate">پاسخ به: {replyTo.body.slice(0, 80) || "پیام"}</span>
          <button type="button" className="ms-auto" onClick={onClearReply} aria-label="لغو پاسخ">
            <Icon icon={X} size={14} />
          </button>
        </div>
      ) : null}

      {attachmentUrl ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs text-stone-700">
          <Icon icon={Paperclip} size={14} />
          <span className="truncate">{attachmentName ?? "پیوست"}</span>
          <button
            type="button"
            className="ms-auto rounded p-0.5 hover:bg-stone-200"
            onClick={() => {
              setAttachmentUrl(null);
              setAttachmentName(null);
              setAttachmentMime(null);
            }}
            aria-label="حذف پیوست"
          >
            <Icon icon={X} size={14} />
          </button>
        </div>
      ) : null}
      {uploadError ? <p className="mb-2 text-xs text-rose-600">{uploadError}</p> : null}

      <div className="flex items-end gap-2">
        {onUpload ? (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="hidden"
              onChange={(e) => void onFile(e)}
            />
            <button
              type="button"
              disabled={locked}
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition",
                variant === "storefront"
                  ? "border border-border text-secondary hover:bg-border/40"
                  : "border border-stone-200 text-stone-600 hover:bg-stone-50",
                locked && "opacity-50",
                shake && "motion-safe:animate-pulse ring-2 ring-rose-400",
              )}
              aria-label="پیوست فایل"
            >
              <Icon
                icon={uploading ? SpinnerGap : Paperclip}
                size={18}
                className={uploading ? "animate-spin" : undefined}
              />
            </button>
          </>
        ) : null}

        {allowInternal ? (
          <button
            type="button"
            title="یادداشت داخلی"
            onClick={() => setInternal((v) => !v)}
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition",
              internal
                ? "border-amber-300 bg-amber-50 text-amber-900"
                : "border-stone-200 text-stone-500",
            )}
          >
            <Icon icon={NoteBlank} size={18} />
          </button>
        ) : null}

        <div className="relative min-w-0 flex-1">
          <label htmlFor={labelId} className="sr-only">
            متن پیام
          </label>
          <textarea
            id={labelId}
            ref={textareaRef}
            rows={1}
            value={text}
            disabled={locked}
            onChange={(e) => {
              setText(e.target.value.slice(0, MAX_CHARS));
              if (onTyping) {
                if (typingTimer.current) clearTimeout(typingTimer.current);
                typingTimer.current = setTimeout(() => onTyping(), 250);
              }
            }}
            onKeyDown={onKeyDown}
            onPaste={onPaste}
            placeholder={
              internal ? "یادداشت داخلی (فقط اپراتورها)…" : placeholder
            }
            className={cn(
              "max-h-40 min-h-10 w-full resize-none rounded-xl px-3 py-2.5 text-sm leading-relaxed outline-none transition",
              "focus-visible:ring-2 focus-visible:ring-amber-700/25",
              variant === "storefront"
                ? "border border-border bg-surface-elevated text-primary placeholder:text-secondary/70"
                : "border border-stone-200 bg-stone-50 text-zinc-900 placeholder:text-stone-400",
              locked && "opacity-60",
            )}
          />
          <span
            className={cn(
              "pointer-events-none absolute bottom-1.5 left-2 text-[10px]",
              text.length > MAX_CHARS - 100 ? "text-rose-500" : "text-stone-400",
            )}
          >
            {text.length}/{MAX_CHARS}
          </span>
        </div>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => void submit()}
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition active:scale-[0.97]",
            variant === "storefront"
              ? "bg-gold text-primary hover:brightness-95 disabled:opacity-40"
              : "bg-zinc-900 text-white hover:bg-zinc-800 disabled:bg-zinc-300",
          )}
          aria-label="ارسال پیام"
        >
          <Icon
            icon={sending ? SpinnerGap : PaperPlaneTilt}
            size={18}
            className={sending ? "animate-spin" : undefined}
          />
        </button>
      </div>
      <p
        className={cn(
          "mt-1.5 text-[11px]",
          variant === "storefront" ? "text-secondary" : "text-stone-400",
        )}
      >
        Enter ارسال · Shift+Enter خط جدید · Paste/Drop برای فایل
        {canned.length ? " · میانبر پاسخ آماده با /" : ""}
      </p>
    </div>
  );
}
