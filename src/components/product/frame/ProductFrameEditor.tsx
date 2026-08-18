"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowCounterClockwise, Minus, Plus } from "@phosphor-icons/react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";
import {
  catalogImageFit,
  catalogMediaClass,
  clampImageFit,
  DEFAULT_IMAGE_FIT,
  isCustomImageFit,
  productImageFitStyle,
  type ProductImageFit,
} from "@/lib/product-image";

const SCALE_STEP = 0.1;
const PAN_THRESHOLD_PX = 8;

function trySetPointerCapture(target: EventTarget | null, pointerId: number) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.setPointerCapture !== "function") return;
  try {
    el.setPointerCapture(pointerId);
  } catch {
    /* jsdom / detached node */
  }
}

function tryReleasePointerCapture(
  target: EventTarget | null,
  pointerId: number,
) {
  const el = target as HTMLElement | null;
  if (!el || typeof el.releasePointerCapture !== "function") return;
  try {
    el.releasePointerCapture(pointerId);
  } catch {
    /* already released */
  }
}

export function ProductFrameEditor({
  src,
  value,
  onChange,
  className,
}: {
  src: string;
  value?: ProductImageFit;
  onChange: (next: ProductImageFit) => void;
  className?: string;
}) {
  const frameRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    lastX: number;
    lastY: number;
    originX: number;
    originY: number;
    panning: boolean;
  } | null>(null);

  const [fit, setFit] = useState(() =>
    clampImageFit(value ?? DEFAULT_IMAGE_FIT),
  );
  const fitRef = useRef(fit);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const incoming = clampImageFit(value ?? DEFAULT_IMAGE_FIT);

  useEffect(() => {
    if (dragRef.current) return;
    fitRef.current = incoming;
    setFit(incoming);
  }, [src, incoming.scale, incoming.x, incoming.y]);

  const custom = isCustomImageFit(fit);
  const imgStyle = productImageFitStyle(fit);

  const commit = (partial: Partial<ProductImageFit>) => {
    const current = fitRef.current;
    const next = clampImageFit({
      scale: partial.scale ?? current.scale,
      x: partial.x ?? current.x,
      y: partial.y ?? current.y,
    });
    fitRef.current = next;
    setFit(next);
    onChangeRef.current(next);
  };

  const reset = () => {
    fitRef.current = DEFAULT_IMAGE_FIT;
    setFit(DEFAULT_IMAGE_FIT);
    onChangeRef.current(DEFAULT_IMAGE_FIT);
  };

  useEffect(() => {
    const el = frameRef.current;
    if (!el || !src) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const delta = event.deltaY > 0 ? -SCALE_STEP : SCALE_STEP;
      commit({ scale: fitRef.current.scale + delta });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [src]);

  if (!src) {
    return (
      <div
        className={cn(
          "gallery-frame flex aspect-square w-full max-w-[220px] items-center justify-center text-xs text-zinc-400",
          className,
        )}
      >
        تصویری نیست
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div
        ref={frameRef}
        className={cn(
          "gallery-frame relative aspect-square w-full max-w-[220px] cursor-grab overflow-hidden touch-none active:cursor-grabbing",
          catalogMediaClass(src, fit),
        )}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          event.preventDefault();
          event.stopPropagation();
          trySetPointerCapture(event.currentTarget, event.pointerId);
          dragRef.current = {
            pointerId: event.pointerId,
            lastX: event.clientX,
            lastY: event.clientY,
            originX: event.clientX,
            originY: event.clientY,
            panning: false,
          };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          if (!drag || drag.pointerId !== event.pointerId) return;
          if (!drag.panning) {
            const dist = Math.hypot(
              event.clientX - drag.originX,
              event.clientY - drag.originY,
            );
            if (dist < PAN_THRESHOLD_PX) return;
            drag.panning = true;
            drag.lastX = event.clientX;
            drag.lastY = event.clientY;
            return;
          }
          const box = frameRef.current?.getBoundingClientRect();
          if (!box?.width || !box.height) return;
          const dx = ((event.clientX - drag.lastX) / box.width) * 100;
          const dy = ((event.clientY - drag.lastY) / box.height) * 100;
          drag.lastX = event.clientX;
          drag.lastY = event.clientY;
          const current = fitRef.current;
          commit({ x: current.x + dx, y: current.y + dy });
        }}
        onPointerUp={(event) => {
          if (dragRef.current?.pointerId === event.pointerId) {
            dragRef.current = null;
          }
          tryReleasePointerCapture(event.currentTarget, event.pointerId);
        }}
        onPointerCancel={(event) => {
          dragRef.current = null;
          tryReleasePointerCapture(event.currentTarget, event.pointerId);
        }}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none select-none"
          style={{
            objectFit: catalogImageFit(src, fit),
            ...imgStyle,
          }}
        />
      </div>

      <div className="flex max-w-[220px] items-center gap-1.5" dir="ltr">
        <button
          type="button"
          aria-label="کوچک‌تر"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          onClick={() => commit({ scale: fitRef.current.scale - SCALE_STEP })}
        >
          <Icon icon={Minus} size={14} />
        </button>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={fit.scale}
          aria-label="زوم تصویر"
          className="h-8 min-w-0 flex-1 accent-zinc-800"
          onChange={(event) => commit({ scale: Number(event.target.value) })}
        />
        <button
          type="button"
          aria-label="بزرگ‌تر"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          onClick={() => commit({ scale: fitRef.current.scale + SCALE_STEP })}
        >
          <Icon icon={Plus} size={14} />
        </button>
        <button
          type="button"
          aria-label="بازنشانی قاب"
          disabled={!custom}
          className="flex h-8 shrink-0 items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
          onClick={reset}
        >
          <Icon icon={ArrowCounterClockwise} size={14} />
          بازنشانی
        </button>
      </div>
      <p className="max-w-[220px] text-[11px] text-zinc-500">
        بکشید تا جابه‌جا شود؛ + و − یا چرخ موس برای زوم.
      </p>
    </div>
  );
}
