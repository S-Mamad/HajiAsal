import {
  AFTER_HOURS_GREETING,
  LIVE_GREETING,
  OFFLINE_OPERATOR_GREETING,
  SUPPORT_END_HOUR,
  SUPPORT_START_HOUR,
  SUPPORT_TIME_ZONE,
} from "./constants";

export function getHourInTimeZone(
  now: Date,
  timeZone = SUPPORT_TIME_ZONE,
): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(now);
  return Number(parts.find((part) => part.type === "hour")?.value ?? 0);
}

export function isWithinSupportHours(
  now: Date = new Date(),
  timeZone = SUPPORT_TIME_ZONE,
): boolean {
  const hour = getHourInTimeZone(now, timeZone);
  return hour >= SUPPORT_START_HOUR && hour < SUPPORT_END_HOUR;
}

export function supportGreeting(input: {
  withinHours: boolean;
  operatorOnline: boolean;
}): string {
  if (!input.withinHours) return AFTER_HOURS_GREETING;
  if (!input.operatorOnline) return OFFLINE_OPERATOR_GREETING;
  return LIVE_GREETING;
}
