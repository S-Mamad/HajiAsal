"use client";

import { useEffect, useState } from "react";

/**
 * Returns keyboard overlap height (px) using Visual Viewport API.
 * 0 when keyboard is closed or API is unavailable.
 */
export function useVisualViewportOffset(): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      const keyboard = Math.max(
        0,
        Math.round(window.innerHeight - vv.height - vv.offsetTop),
      );
      setOffset(keyboard);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    window.addEventListener("orientationchange", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return offset;
}
