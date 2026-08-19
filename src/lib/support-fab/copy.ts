import type { SiteConfig } from "@/types";
import {
  AFTER_HOURS_GREETING,
  LIVE_GREETING,
  OFFLINE_OPERATOR_GREETING,
  WIDGET_STATUS_AFTER_HOURS,
  WIDGET_STATUS_LIVE,
  WIDGET_STATUS_OFFLINE,
  WIDGET_STATUS_QUEUE,
} from "./constants";

export type SupportWidgetCopy = {
  welcomeLineLive: string;
  welcomeLineQueue: string;
  welcomeLineAfterHours: string;
  statusLive: string;
  statusQueue: string;
  statusAfterHours: string;
  statusOffline: string;
  liveGreeting: string;
  offlineOperatorGreeting: string;
  afterHoursGreeting: string;
};

export const DEFAULT_SUPPORT_WIDGET_COPY: SupportWidgetCopy = {
  welcomeLineLive: "هر سوالی دارید بنویسید؛ پاسخ همین‌جا می‌آید.",
  welcomeLineQueue: "پیام‌تان را می‌خوانیم و به‌زودی پاسخ می‌دهیم.",
  welcomeLineAfterHours: "پیام‌تان ثبت می‌شود؛ از ۷ صبح پاسخ می‌دهیم.",
  statusLive: WIDGET_STATUS_LIVE,
  statusQueue: WIDGET_STATUS_QUEUE,
  statusAfterHours: WIDGET_STATUS_AFTER_HOURS,
  statusOffline: WIDGET_STATUS_OFFLINE,
  liveGreeting: LIVE_GREETING,
  offlineOperatorGreeting: OFFLINE_OPERATOR_GREETING,
  afterHoursGreeting: AFTER_HOURS_GREETING,
};

function asText(value: unknown, fallback: string, max: number): string {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, max);
}

export function resolveSupportWidgetCopy(
  settings: Partial<SiteConfig> | null | undefined,
): SupportWidgetCopy {
  const raw = settings?.supportWidgetCopy;
  return {
    welcomeLineLive: asText(
      raw?.welcomeLineLive,
      DEFAULT_SUPPORT_WIDGET_COPY.welcomeLineLive,
      160,
    ),
    welcomeLineQueue: asText(
      raw?.welcomeLineQueue,
      DEFAULT_SUPPORT_WIDGET_COPY.welcomeLineQueue,
      160,
    ),
    welcomeLineAfterHours: asText(
      raw?.welcomeLineAfterHours,
      DEFAULT_SUPPORT_WIDGET_COPY.welcomeLineAfterHours,
      160,
    ),
    statusLive: asText(
      raw?.statusLive,
      DEFAULT_SUPPORT_WIDGET_COPY.statusLive,
      80,
    ),
    statusQueue: asText(
      raw?.statusQueue,
      DEFAULT_SUPPORT_WIDGET_COPY.statusQueue,
      80,
    ),
    statusAfterHours: asText(
      raw?.statusAfterHours,
      DEFAULT_SUPPORT_WIDGET_COPY.statusAfterHours,
      80,
    ),
    statusOffline: asText(
      raw?.statusOffline,
      DEFAULT_SUPPORT_WIDGET_COPY.statusOffline,
      80,
    ),
    liveGreeting: asText(
      raw?.liveGreeting,
      DEFAULT_SUPPORT_WIDGET_COPY.liveGreeting,
      200,
    ),
    offlineOperatorGreeting: asText(
      raw?.offlineOperatorGreeting,
      DEFAULT_SUPPORT_WIDGET_COPY.offlineOperatorGreeting,
      200,
    ),
    afterHoursGreeting: asText(
      raw?.afterHoursGreeting,
      DEFAULT_SUPPORT_WIDGET_COPY.afterHoursGreeting,
      200,
    ),
  };
}

export function widgetWelcomeLine(
  copy: SupportWidgetCopy,
  input: { withinHours: boolean; operatorOnline: boolean },
): string {
  if (!input.withinHours) return copy.welcomeLineAfterHours;
  if (input.operatorOnline) return copy.welcomeLineLive;
  return copy.welcomeLineQueue;
}

export function widgetStatusCopy(
  copy: SupportWidgetCopy,
  input: {
    withinHours: boolean;
    operatorOnline: boolean;
    browserOnline: boolean;
  },
): string {
  if (!input.browserOnline) return copy.statusOffline;
  if (!input.withinHours) return copy.statusAfterHours;
  if (input.operatorOnline) return copy.statusLive;
  return copy.statusQueue;
}

export function widgetGuestGreeting(
  copy: SupportWidgetCopy,
  input: { withinHours: boolean; operatorOnline: boolean },
): string {
  if (!input.withinHours) return copy.afterHoursGreeting;
  if (!input.operatorOnline) return copy.offlineOperatorGreeting;
  return copy.liveGreeting;
}
