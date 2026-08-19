"use client";

import { useMemo } from "react";
import { useSiteSettings } from "@/context/SiteSettingsContext";
import { resolvePageCopy, type PageCopySettings } from "@/lib/page-copy";

export function usePageCopy(): PageCopySettings {
  const settings = useSiteSettings();
  return useMemo(() => resolvePageCopy(settings), [settings]);
}
