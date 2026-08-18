"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChatCircle, X } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { SupportPresenceDot } from "@/components/support-fab/SupportPresenceDot";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/ui/haptic";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import {
  FAB_CART_DWELL_MS,
  FAB_DESKTOP_PANEL_HEIGHT_PX,
  FAB_DESKTOP_PANEL_WIDTH_PX,
  FAB_EDGE_GAP_PX,
  FAB_ENTRANCE_DELAY_MS,
  FAB_PANEL_Z_INDEX,
  FAB_PRESS_SCALE,
  FAB_PROXIMITY_PX,
  FAB_SCROLL_HIDE_DELTA,
  FAB_SIZE_PX,
  FAB_TOOLTIP_VISIBLE_MS,
  FAB_WELCOME_DELAY_MS,
  FAB_WELCOME_SEEN_KEY,
  FAB_Z_INDEX,
} from "@/lib/support-fab/constants";
import {
  classifyPathname,
  fabAriaLabel,
  shouldMountSupportFab,
} from "@/lib/support-fab/context";
import { isWithinSupportHours } from "@/lib/support-fab/hours";
import {
  createPathPrefetchGate,
  isWithinProximity,
} from "@/lib/support-fab/prefetch";
import {
  readFlag,
  resolveTooltip,
  shouldShowTooltip,
  writeFlag,
} from "@/lib/support-fab/tooltip";
import { playSupportPop } from "./playPop";
import { useRageAssist } from "./useRageAssist";
import type { SupportHandshake } from "./types";

const SupportFabPanel = dynamic(() => import("./SupportFabPanel"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-gold">
      <Icon icon={X} size={22} weight="bold" />
    </div>
  ),
});

function readProductOutOfStock(): boolean {
  if (typeof document === "undefined") return false;
  return (
    document
      .querySelector("[data-support-in-stock]")
      ?.getAttribute("data-support-in-stock") === "0"
  );
}

const spring = { type: "spring" as const, stiffness: 420, damping: 28, mass: 0.75 };

export function SupportFabRoot() {
  const pathname = usePathname() ?? "/";
  if (!shouldMountSupportFab(pathname)) return null;
  return <SupportFabEngine pathname={pathname} />;
}

function SupportFabEngine({ pathname }: { pathname: string }) {
  const reduceMotion = useReducedMotion();
  const pageKind = classifyPathname(pathname);
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);
  const [unread, setUnread] = useState(0);
  const [handshake, setHandshake] = useState<SupportHandshake | null>(null);
  const [online, setOnline] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [hoursReady, setHoursReady] = useState(false);
  const [productOutOfStock, setProductOutOfStock] = useState(false);
  const [cartDwellElapsed, setCartDwellElapsed] = useState(false);
  const [scrollHidden, setScrollHidden] = useState(false);

  const rageAssist = useRageAssist(!open);
  const fabRef = useRef<HTMLDivElement>(null);
  const lastScrollY = useRef(0);
  const scrollTick = useRef(false);
  const prefetchGate = useRef(createPathPrefetchGate());
  const pageKindRef = useRef(pageKind);
  pageKindRef.current = pageKind;

  const withinHours =
    handshake?.withinHours ?? (hoursReady ? isWithinSupportHours() : true);

  const prefetchPanel = useCallback(() => {
    void import("./SupportFabPanel");
  }, []);

  const fetchHandshake = useCallback(
    (force = false) => {
      setProductOutOfStock(readProductOutOfStock());
      prefetchPanel();
      if (!prefetchGate.current.shouldFetch(pathname, force)) return;
      const params = new URLSearchParams({
        pageKind: pageKindRef.current,
        currentUrl: window.location.href,
      });
      void fetch(`/api/account/support-widget?${params}`, {
        credentials: "include",
      })
        .then((res) => res.json())
        .then((data: SupportHandshake) => {
          setHandshake(data);
          setUnread(data.unreadCount ?? 0);
        })
        .catch(() => undefined);
    },
    [pathname, prefetchPanel],
  );

  useEffect(() => {
    setOnline(navigator.onLine);
    setHoursReady(true);
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    const t = window.setTimeout(() => setEntered(true), FAB_ENTRANCE_DELAY_MS);
    const idle = window.setTimeout(() => fetchHandshake(), 3000);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(idle);
    };
    // Mount-only: do not re-enter or re-idle on route/prefetch identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    prefetchGate.current.forget();
    setProductOutOfStock(readProductOutOfStock());
  }, [pathname]);

  useEffect(() => {
    setCartDwellElapsed(false);
    if (pageKind !== "cart") return;
    const id = window.setTimeout(() => setCartDwellElapsed(true), FAB_CART_DWELL_MS);
    return () => window.clearTimeout(id);
  }, [pageKind]);

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  useBodyScrollLock(open && isMobile);

  useEffect(() => {
    if (!open) return;
    prefetchPanel();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
    };
  }, [open, prefetchPanel]);

  useEffect(() => {
    if (open) return;
    const onMove = (event: PointerEvent) => {
      const el = fabRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (
        !isWithinProximity(
          event.clientX,
          event.clientY,
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
          FAB_SIZE_PX / 2 + FAB_PROXIMITY_PX,
        )
      ) {
        return;
      }
      fetchHandshake();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [open, fetchHandshake]);

  useEffect(() => {
    if (open) return;
    const id = window.setInterval(() => fetchHandshake(true), 60_000);
    return () => window.clearInterval(id);
  }, [open, fetchHandshake]);

  useEffect(() => {
    if (open) {
      setScrollHidden(false);
      lastScrollY.current = window.scrollY;
      return;
    }
    lastScrollY.current = window.scrollY;
    const onScroll = () => {
      if (scrollTick.current) return;
      scrollTick.current = true;
      window.requestAnimationFrame(() => {
        scrollTick.current = false;
        const y = window.scrollY;
        const delta = y - lastScrollY.current;
        if (Math.abs(delta) < FAB_SCROLL_HIDE_DELTA) return;
        setScrollHidden(delta > 0 && y > 24);
        lastScrollY.current = y;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [open]);

  useEffect(() => {
    if (open) {
      setTooltip(null);
      return;
    }
    const resolved = resolveTooltip({
      pageKind,
      productOutOfStock: readProductOutOfStock() || productOutOfStock,
      rageAssist,
      cartDwellElapsed,
    });
    const welcomeSeen = readFlag(sessionStorage, FAB_WELCOME_SEEN_KEY);
    if (!shouldShowTooltip(resolved.kind, welcomeSeen)) return;
    const delay = resolved.kind === "context" ? 400 : FAB_WELCOME_DELAY_MS;
    const show = window.setTimeout(() => {
      setTooltip(resolved.copy);
      if (resolved.kind === "welcome") {
        writeFlag(sessionStorage, FAB_WELCOME_SEEN_KEY);
      }
    }, delay);
    const hide = window.setTimeout(
      () => setTooltip(null),
      delay + FAB_TOOLTIP_VISIBLE_MS,
    );
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, [open, pageKind, productOutOfStock, rageAssist, cartDwellElapsed]);

  const close = useCallback(() => setOpen(false), []);

  const openPanel = () => {
    prefetchPanel();
    hapticLight();
    if (!reduceMotion) playSupportPop();
    setOpen(true);
  };

  const label = fabAriaLabel({
    unread: unread > 0 && !open,
    online,
    withinHours,
  });

  const bottom = `calc(var(--support-fab-base, env(safe-area-inset-bottom, 0px)) + var(--sticky-bottom-bar-h, 0px) + ${FAB_EDGE_GAP_PX}px)`;
  const closedWidth = FAB_SIZE_PX;
  const openWidth = isMobile ? "100%" : FAB_DESKTOP_PANEL_WIDTH_PX;
  const openHeight = isMobile ? "min(62dvh, 30rem)" : FAB_DESKTOP_PANEL_HEIGHT_PX;
  const pos =
    open && isMobile
      ? {
          left: 0,
          right: 0,
          bottom: "max(0px, env(safe-area-inset-bottom, 0px))",
        }
      : { right: FAB_EDGE_GAP_PX, left: "auto" as const, bottom };

  return (
    <>
      <AnimatePresence>
        {open ? (
          <motion.button
            key="support-fab-scrim"
            type="button"
            className="fixed inset-0 bg-black/20 backdrop-blur-[2px]"
            style={{ zIndex: FAB_PANEL_Z_INDEX - 1 }}
            aria-label="بستن پشتیبانی"
            initial={reduceMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
          />
        ) : null}
      </AnimatePresence>

      <motion.div
        ref={fabRef}
        className="fixed"
        style={{
          zIndex: open ? FAB_PANEL_Z_INDEX : FAB_Z_INDEX,
          ...pos,
        }}
        data-testid="support-fab"
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label={open ? "گفتگوی پشتیبانی حاجی‌عسل" : undefined}
        initial={false}
        animate={{
          opacity: entered && !(scrollHidden && !open) ? 1 : 0,
          y: scrollHidden && !open ? 16 : 0,
          pointerEvents: scrollHidden && !open ? "none" : "auto",
        }}
        transition={reduceMotion ? { duration: 0 } : spring}
        aria-hidden={scrollHidden && !open ? true : undefined}
      >
        <AnimatePresence>
          {tooltip && !open ? (
            <motion.div
              initial={
                reduceMotion
                  ? { opacity: 1 }
                  : { opacity: 0, scale: 0.96, x: 10 }
              }
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={reduceMotion ? { duration: 0 } : spring}
              className="absolute top-1/2 z-[1] end-[calc(100%+12px)] -translate-y-1/2 whitespace-nowrap rounded-2xl border border-border bg-surface/95 px-3.5 py-2 text-xs text-primary shadow-[0_16px_40px_-20px_rgba(28,25,23,0.45)] backdrop-blur-md"
              role="status"
            >
              {tooltip}
              <span
                aria-hidden
                className="absolute top-1/2 -end-1 h-2 w-2 -translate-y-1/2 rotate-45 border-e border-t border-border bg-surface/95"
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        <AnimatePresence mode="popLayout" initial={false}>
          {open ? (
            <motion.div
              key="support-panel-shell"
              initial={
                reduceMotion
                  ? false
                  : { opacity: 0, scale: 0.94, y: isMobile ? 24 : 12 }
              }
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={
                reduceMotion
                  ? undefined
                  : { opacity: 0, scale: 0.96, y: isMobile ? 16 : 8 }
              }
              transition={reduceMotion ? { duration: 0.15 } : spring}
              className={cn(
                "support-fab-panel relative flex h-full min-h-0 flex-col overflow-hidden border border-border",
                isMobile ? "rounded-t-3xl" : "rounded-3xl",
              )}
              style={{
                width: openWidth,
                height: openHeight,
              }}
            >
              <SupportFabPanel
                open={open}
                onClose={close}
                pageKind={pageKind}
                productOutOfStock={productOutOfStock}
                handshake={handshake}
                onHandshake={setHandshake}
                onUnread={setUnread}
              />
            </motion.div>
          ) : (
            <motion.button
              key="support-fab"
              type="button"
              onClick={openPanel}
              onFocus={() => fetchHandshake()}
              onMouseEnter={() => fetchHandshake()}
              aria-label={label}
              aria-haspopup="dialog"
              aria-expanded={false}
              tabIndex={scrollHidden ? -1 : 0}
              initial={reduceMotion ? false : { scale: 0 }}
              animate={{
                scale: entered ? 1 : 0,
                opacity: 1,
              }}
              exit={reduceMotion ? undefined : { scale: 0.85, opacity: 0 }}
              whileTap={!reduceMotion ? { scale: FAB_PRESS_SCALE } : undefined}
              transition={reduceMotion ? { duration: 0.2 } : spring}
              className="support-fab-btn relative flex min-h-[56px] min-w-[56px] cursor-pointer items-center justify-center rounded-full touch-manipulation"
              style={{
                width: closedWidth,
                height: closedWidth,
              }}
            >
              <Icon icon={ChatCircle} size={22} weight="regular" />
              {online && withinHours ? (
                <SupportPresenceDot live />
              ) : (
                <SupportPresenceDot live={false} />
              )}
              {unread > 0 && !open ? (
                <span
                  className="support-fab-badge absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold leading-none text-white shadow-sm ring-2 ring-surface"
                  aria-label={`${unread.toLocaleString("fa-IR")} پیام خوانده‌نشده`}
                >
                  {unread > 9 ? "۹+" : unread.toLocaleString("fa-IR")}
                </span>
              ) : null}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}

export default SupportFabRoot;
