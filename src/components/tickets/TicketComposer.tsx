"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
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

type CannedItem = { shortcut: string; title: string; body: string };

type Props = {
  variant: TicketChatVariant;
  ticketId?: string;
  roleKey?: string;
  disabled?: boolean;
  sending?: boolean;
  closed?: boolean;
  placeholder?: string;
  /** Prefill draft once on mount (FAB quick prompts). */
  initialText?: string;
  allowInternal?: boolean;
  replyTo?: ChatMessage | null;
  onClearReply?: () => void;
  canned?: CannedItem[];
  onTyping?: () => void;
  keyboardOffset?: number;
  /** Tight chrome for FAB / mobile sheet composers. */
  compact?: boolean;
  /** Account ticket shell already clears safe-area; skip double inset. */
  omitBottomSafeArea?: boolean;
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
  initialText,
  allowInternal,
  replyTo,
  onClearReply,
  canned = [],
  onTyping,
  keyboardOffset = 0,
  compact = false,
  omitBottomSafeArea = false,
  onSend,
  onUpload,
}: Props) {
  const [text, setText] = useState(initialText ?? "");
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [attachmentMime, setAttachmentMime] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [shake, setShake] = useState(false);
  const [internal, setInternal] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [slashOpen, setSlashOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const labelId = useId();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStore = variant === "storefront";
  const bottomPad = omitBottomSafeArea
    ? compact
      ? "px-3 pb-2.5 pt-2"
      : "px-3 pb-3 pt-2 sm:px-4"
    : compact
      ? "px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2"
      : "px-3 pb-[max(0.65rem,env(safe-area-inset-bottom,0px))] pt-2 sm:px-4";

  const fieldChrome = isStore
    ? "rounded-[1.375rem] border border-border bg-surface-elevated"
    : "rounded-[1.375rem] border border-stone-200 bg-white";

  const draftKey =
    ticketId && roleKey ? draftStorageKey(ticketId, roleKey) : null;

  useEffect(() => {
    if (!draftKey) return;
    if (initialText) return;
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) setText(raw);
    } catch {
      /* ignore */
    }
  }, [draftKey, initialText]);

  useEffect(() => {
    if (!initialText) return;
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, [initialText]);

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
    el.style.height = `${Math.min(el.scrollHeight, compact ? 96 : 140)}px`;
  }, [compact]);

  useEffect(() => {
    resize();
  }, [text, resize]);

  const canSend =
    !locked &&
    (text.trim().length > 0 || !!attachmentUrl) &&
    text.length <= MAX_CHARS;

  const slashQuery = useMemo(() => {
    if (!canned.length) return null;
    if (!text.startsWith("/")) return null;
    const token = text.split(/\s+/)[0] ?? "";
    return token.slice(1).toLowerCase();
  }, [canned.length, text]);

  const slashMatches = useMemo(() => {
    if (slashQuery === null) return [];
    return canned
      .filter(
        (c) =>
          c.shortcut.replace(/^\//, "").toLowerCase().includes(slashQuery) ||
          c.title.toLowerCase().includes(slashQuery),
      )
      .slice(0, 6);
  }, [canned, slashQuery]);

  useEffect(() => {
    setSlashOpen(slashQuery !== null && slashMatches.length > 0);
  }, [slashMatches.length, slashQuery]);

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

  const applyCanned = (item: CannedItem) => {
    setText(item.body);
    setSlashOpen(false);
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  const submit = async () => {
    if (!canSend) return;
    let body = text.trim();
    if (body.startsWith("/") && canned.length) {
      const shortcut = body.split(/\s+/)[0];
      const found = canned.find(
        (c) => c.shortcut === shortcut || c.shortcut === `/${shortcut?.slice(1)}`,
      );
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
    const prevText = text;
    const prevUrl = attachmentUrl;
    const prevName = attachmentName;
    const prevMime = attachmentMime;
    setText("");
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentMime(null);
    setUploadError("");
    setSlashOpen(false);
    onClearReply?.();
    try {
      await onSend(payload);
      if (draftKey) {
        try {
          localStorage.removeItem(draftKey);
        } catch {
          /* ignore */
        }
      }
    } catch {
      setText(prevText);
      setAttachmentUrl(prevUrl);
      setAttachmentName(prevName);
      setAttachmentMime(prevMime);
    } finally {
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashOpen && slashMatches.length && e.key === "ArrowDown") {
      e.preventDefault();
      applyCanned(slashMatches[0]!);
      return;
    }
    if (e.key === "Escape" && slashOpen) {
      setSlashOpen(false);
      return;
    }
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
          "relative z-[1] text-center text-sm",
          compact ? "px-3 py-3" : "px-4 py-4",
          isStore ? "border-t border-border bg-surface text-secondary" : "bg-white text-stone-500",
        )}
        style={
          keyboardOffset > 0
            ? { paddingBottom: `calc(1rem + ${keyboardOffset}px)` }
            : undefined
        }
      >
        این تیکت بسته شده است. برای ادامه گفتگو آن را دوباره باز کنید.
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative z-[1] border-t",
        bottomPad,
        isStore
          ? "border-border bg-surface"
          : "border-stone-200 bg-white",
        dragOver && "ring-2 ring-inset ring-gold/50",
      )}
      style={
        keyboardOffset > 0
          ? {
              paddingBottom: omitBottomSafeArea
                ? `calc(${compact ? "0.5rem" : "0.75rem"} + ${keyboardOffset}px)`
                : `calc(max(${compact ? "0.5rem" : "0.65rem"}, env(safe-area-inset-bottom, 0px)) + ${keyboardOffset}px)`,
            }
          : undefined
      }
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
    >
      {slashOpen && slashMatches.length > 0 ? (
        <div
          className={cn(
            "absolute inset-x-2.5 bottom-full z-20 mb-1 overflow-hidden rounded-2xl py-1 shadow-[0_16px_40px_-18px_rgb(28_25_23/0.4)]",
            isStore ? "bg-surface" : "bg-white",
          )}
          role="listbox"
          aria-label="پاسخ‌های آماده"
        >
          {slashMatches.map((item) => (
            <button
              key={item.shortcut}
              type="button"
              role="option"
              className="flex w-full flex-col gap-0.5 px-3 py-2.5 text-right hover:bg-stone-50"
              onClick={() => applyCanned(item)}
            >
              <span className="text-xs font-medium text-zinc-900">
                {item.shortcut} · {item.title}
              </span>
              <span className="truncate text-[11px] font-light text-stone-500">
                {item.body.slice(0, 80)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {replyTo ? (
        <div
          className={cn(
            "mb-2 flex h-9 items-center gap-2 px-3 text-[12px]",
            "rounded-xl",
            isStore ? "bg-surface-muted text-primary" : "bg-stone-100 text-stone-700",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            پاسخ به: {replyTo.body.slice(0, 80) || "پیام"}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"
            onClick={onClearReply}
            aria-label="لغو پاسخ"
          >
            <Icon icon={X} size={14} />
          </button>
        </div>
      ) : null}

      {attachmentUrl ? (
        <div
          className={cn(
            "mb-2 flex h-9 items-center gap-2 px-3 text-[12px]",
            "rounded-xl",
            isStore
              ? "bg-surface-muted text-primary"
              : "bg-stone-100 text-stone-700",
          )}
        >
          <Icon icon={Paperclip} size={14} className="shrink-0 opacity-70" />
          <span className="min-w-0 flex-1 truncate">
            {attachmentName ?? "پیوست"}
          </span>
          <button
            type="button"
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-surface-muted"
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
      {uploadError ? (
        <p className="mb-2 px-1 text-xs text-rose-600">{uploadError}</p>
      ) : null}

      {/* Native RTL: attach at start, send at end, all h-11. */}
      <div className="flex items-end gap-1.5">
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
                "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition",
                "active:scale-[0.96]",
                isStore
                  ? "text-secondary hover:bg-surface-muted hover:text-primary"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800",
                locked && "pointer-events-none opacity-40",
                shake && "motion-safe:animate-pulse ring-1 ring-rose-400",
              )}
              aria-label="پیوست فایل"
            >
              <Icon
                icon={uploading ? SpinnerGap : Paperclip}
                size={20}
                weight="regular"
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
              "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-[0.96]",
              internal
                ? "bg-amber-100 text-amber-900"
                : "text-stone-500 hover:bg-stone-100",
            )}
          >
            <Icon icon={NoteBlank} size={18} />
          </button>
        ) : null}

        <div
          className={cn(
            "flex min-h-11 min-w-0 flex-1 items-end px-3.5",
            fieldChrome,
            "focus-within:border-gold/45",
          )}
        >
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
                "max-h-24 w-full resize-none bg-transparent py-2.5 text-start outline-none",
                "min-h-11 text-[15px] leading-6",
                isStore
                  ? "text-primary placeholder:text-secondary/45"
                  : "text-zinc-900 placeholder:text-stone-400",
                locked && "opacity-60",
              )}
            />
            {text.length > MAX_CHARS - 200 ? (
              <span
                className={cn(
                  "pointer-events-none absolute bottom-2.5 start-0 text-[10px] tabular-nums",
                  text.length > MAX_CHARS - 100
                    ? "text-rose-500"
                    : "text-stone-400",
                )}
              >
                {text.length}/{MAX_CHARS}
              </span>
            ) : null}
          </div>
        </div>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => void submit()}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition duration-150",
            "active:scale-[0.94]",
            canSend
              ? isStore
                ? "bg-gold text-ink-on-gold"
                : "bg-zinc-900 text-white"
              : isStore
                ? "text-secondary/35"
                : "text-stone-300",
          )}
          aria-label="ارسال پیام"
        >
          <Icon
            icon={sending ? SpinnerGap : PaperPlaneTilt}
            size={18}
            weight={canSend ? "fill" : "regular"}
            className={cn(
              sending && "animate-spin",
              !sending && "-scale-x-100",
            )}
          />
        </button>
      </div>
      {!isStore ? (
        <p className="mt-1.5 hidden px-1 text-[11px] font-light text-stone-400 sm:block">
          Enter ارسال · Shift+Enter خط جدید · Paste/Drop برای فایل
          {canned.length ? " · / برای پاسخ آماده" : ""}
        </p>
      ) : null}
    </div>
  );
}
