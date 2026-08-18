"use client";

import { useEffect } from "react";

let lockCount = 0;
let lockedScrollY = 0;

/**
 * Locks document scroll while overlays are open.
 * Uses position:fixed + scroll restore so iOS Safari does not jump or leave a stuck page.
 */
export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked) return;

    const { body, documentElement } = document;
    const wasUnlocked = lockCount === 0;
    lockCount += 1;

    if (wasUnlocked) {
      lockedScrollY = window.scrollY;
      const scrollbar = window.innerWidth - documentElement.clientWidth;
      body.style.position = "fixed";
      body.style.top = `-${lockedScrollY}px`;
      body.style.left = "0";
      body.style.right = "0";
      body.style.width = "100%";
      body.style.overflow = "hidden";
      if (scrollbar > 0) {
        body.style.paddingRight = `${scrollbar}px`;
      }
    }

    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        body.style.position = "";
        body.style.top = "";
        body.style.left = "";
        body.style.right = "";
        body.style.width = "";
        body.style.overflow = "";
        body.style.paddingRight = "";
        window.scrollTo(0, lockedScrollY);
      }
    };
  }, [locked]);
}
