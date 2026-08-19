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
  const fileInputId = useId();
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(
    null,
  );
  const isStore = variant === "storefront";
  const bottomPad = omitBottomSafeArea
    ? compact
      ? "px-3 pb-2.5 pt-2"
      : "px-3.5 pb-3.5 pt-2.5 sm:px-4"
    : compact
      ? "px-3 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))] pt-2"
      : "px-3.5 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-2.5 sm:px-4";

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

  const clearAttachment = useCallback(() => {
    setAttachmentUrl(null);
    setAttachmentName(null);
    setAttachmentMime(null);
    setAttachmentPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  useEffect(() => {
    return () => {
      setAttachmentPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, []);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    const minH = 32;
    const lineH = 20;
    const maxH = compact ? 96 : 140;
    el.style.height = "0px";
    const next = Math.min(Math.max(el.scrollHeight, minH), maxH);
    el.style.height = `${next}px`;
    const pad = next <= minH ? (minH - lineH) / 2 : 4;
    el.style.paddingTop = `${pad}px`;
    el.style.paddingBottom = `${pad}px`;
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
    setAttachmentUrl(null);
    setAttachmentName(file.name);
    setAttachmentMime(file.type);
    setAttachmentPreviewUrl((prev) => {
      if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
      return file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : null;
    });
    try {
      const res = await onUpload(file);
      setAttachmentUrl(res.url);
      setAttachmentName(res.name ?? file.name);
      setAttachmentMime(res.mimeType ?? file.type);
      setAttachmentPreviewUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return null;
      });
    } catch (err) {
      clearAttachment();
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
    clearAttachment();
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
          isStore
            ? "border-t border-border/60 bg-surface text-secondary"
            : "bg-white text-stone-500",
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
        "ticket-composer-dock relative z-[1]",
        bottomPad,
        dragOver && "ring-2 ring-inset ring-gold/40",
      )}
      style={
        keyboardOffset > 0
          ? {
              paddingBottom: omitBottomSafeArea
                ? `calc(${compact ? "0.5rem" : "0.875rem"} + ${keyboardOffset}px)`
                : `calc(max(${compact ? "0.5rem" : "0.75rem"}, env(safe-area-inset-bottom, 0px)) + ${keyboardOffset}px)`,
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
            "absolute inset-x-3 bottom-full z-20 mb-2 overflow-hidden rounded-2xl border border-border/50 py-1 shadow-[0_18px_40px_-20px_rgb(28_25_23/0.35)]",
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
              className="flex w-full flex-col gap-0.5 px-3.5 py-2.5 text-right transition hover:bg-surface-muted/80"
              onClick={() => applyCanned(item)}
            >
              <span className="text-xs font-medium text-primary">
                {item.shortcut} · {item.title}
              </span>
              <span className="truncate text-[11px] font-light text-secondary">
                {item.body.slice(0, 80)}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {uploadError ? (
        <p className="mb-2 px-1 text-xs text-rose-600">{uploadError}</p>
      ) : null}

      {replyTo ? (
        <div className="mb-1.5 flex h-7 items-center gap-2 rounded-lg bg-surface-muted/50 px-2.5 text-[11px] text-secondary">
          <span className="min-w-0 flex-1 truncate">
            پاسخ به: {replyTo.body.slice(0, 80) || "پیام"}
          </span>
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-white/80"
            onClick={onClearReply}
            aria-label="لغو پاسخ"
          >
            <Icon icon={X} size={12} />
          </button>
        </div>
      ) : null}

      {uploading || attachmentUrl || attachmentName ? (
        <div className="mb-1.5 flex h-7 items-center gap-2 rounded-lg bg-surface-muted/50 px-2 text-[11px] text-secondary">
          {attachmentPreviewUrl ||
          (attachmentMime?.startsWith("image/") && attachmentUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={attachmentPreviewUrl ?? attachmentUrl ?? ""}
              alt=""
              className="h-5 w-5 shrink-0 rounded object-cover"
            />
          ) : (
            <Icon icon={Paperclip} size={12} className="shrink-0 opacity-70" />
          )}
          <span className="min-w-0 flex-1 truncate">
            {uploading ? "در حال آپلود…" : (attachmentName ?? "پیوست")}
          </span>
          {uploading ? (
            <Icon
              icon={SpinnerGap}
              size={12}
              className="shrink-0 animate-spin opacity-70"
            />
          ) : (
            <button
              type="button"
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-stone-500 hover:bg-white/80"
              onClick={clearAttachment}
              aria-label="حذف پیوست"
            >
              <Icon icon={X} size={12} />
            </button>
          )}
        </div>
      ) : null}

      {/*
        RTL: ارسال راست · متن · سنجاق چپ — یک کپسول مینیمال هم‌خوان با canvas
      */}
      <div
        className={cn(
          "ticket-composer-bar flex items-center gap-1 rounded-[1.125rem] border px-1 py-0.5",
          "bg-surface/88 backdrop-blur-sm transition-shadow duration-200",
          "focus-within:ring-1 focus-within:ring-gold/30",
          isStore ? "border-border/35" : "border-stone-200/80",
          "dark:bg-surface/90 dark:border-white/8",
        )}
      >
        <button
          type="button"
          disabled={!canSend}
          onClick={() => void submit()}
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition duration-150",
            "active:scale-95",
            canSend
              ? isStore
                ? "bg-gold text-ink-on-gold hover:bg-gold-bright"
                : "bg-zinc-900 text-white hover:bg-zinc-800"
              : "text-secondary/45",
            !canSend && "pointer-events-none",
          )}
          aria-label="ارسال پیام"
        >
          <Icon
            icon={sending ? SpinnerGap : PaperPlaneTilt}
            size={16}
            weight={canSend ? "fill" : "regular"}
            className={cn(sending && "animate-spin")}
          />
        </button>

        <div className="relative flex min-h-8 min-w-0 flex-1 items-center">
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
              "max-h-20 w-full min-h-8 resize-none border-0 bg-transparent px-2 py-0 text-start",
              "text-[13.5px] leading-5 outline-none focus:outline-none focus:ring-0",
              isStore
                ? "text-primary placeholder:text-secondary/55"
                : "text-zinc-900 placeholder:text-stone-400",
              locked && "opacity-60",
            )}
          />
          {text.length > MAX_CHARS - 200 ? (
            <span
              className={cn(
                "pointer-events-none absolute bottom-1.5 start-2 text-[10px] tabular-nums",
                text.length > MAX_CHARS - 100
                  ? "text-rose-500"
                  : "text-stone-400",
              )}
            >
              {text.length}/{MAX_CHARS}
            </span>
          ) : null}
        </div>

        {allowInternal ? (
          <button
            type="button"
            title="یادداشت داخلی"
            onClick={() => setInternal((v) => !v)}
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-secondary/70 transition",
              "hover:bg-surface-muted/80 hover:text-primary active:scale-95",
              internal && "bg-amber-100/90 text-amber-900",
            )}
          >
            <Icon icon={NoteBlank} size={16} />
          </button>
        ) : null}

        {onUpload ? (
          <>
            <input
              id={fileInputId}
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
              className="sr-only"
              disabled={locked}
              aria-label="پیوست فایل"
              onChange={(e) => void onFile(e)}
            />
            <label
              htmlFor={fileInputId}
              className={cn(
                "flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary/70 transition",
                "hover:bg-surface-muted/80 hover:text-primary active:scale-95",
                locked && "pointer-events-none opacity-40",
                shake && "motion-safe:animate-pulse ring-1 ring-rose-400",
              )}
            >
              <Icon
                icon={uploading ? SpinnerGap : Paperclip}
                size={17}
                weight="regular"
                className={uploading ? "animate-spin" : undefined}
              />
            </label>
          </>
        ) : null}
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
