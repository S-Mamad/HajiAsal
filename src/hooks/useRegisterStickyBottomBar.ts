"use client";

import { useEffect, type RefObject } from "react";

const VAR = "--sticky-bottom-bar-h";

type Owner = { id: number; height: number };

const owners = new Map<number, Owner>();
let nextId = 1;

function publishMaxHeight() {
  let max = 0;
  for (const owner of owners.values()) {
    if (owner.height > max) max = owner.height;
  }
  document.documentElement.style.setProperty(VAR, `${max}px`);
}

/**
 * Registers a sticky bottom bar height for FAB lift / content clearance.
 * Multiple owners (route transitions, Strict Mode) are reference-counted so
 * cleanup of one bar cannot wipe another still-mounted bar.
 */
export function useRegisterStickyBottomBar(
  active: boolean,
  ref: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active || !ref.current) return;

    const id = nextId++;
    const el = ref.current;

    const apply = () => {
      const display = getComputedStyle(el).display;
      const height = display === "none" ? 0 : el.offsetHeight;
      owners.set(id, { id, height });
      publishMaxHeight();
    };

    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(el);
    window.addEventListener("resize", apply);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", apply);
      owners.delete(id);
      publishMaxHeight();
    };
  }, [active, ref]);
}
