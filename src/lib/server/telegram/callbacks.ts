import { z } from "zod";

const callbackActionSchema = z.enum(["cancel", "processing"]);

const parsedCallbackSchema = z.object({
  action: callbackActionSchema,
  orderId: z.string().min(1).max(48),
});

export type OrderCallbackAction = z.infer<typeof callbackActionSchema>;

export type ParsedOrderCallback = z.infer<typeof parsedCallbackSchema>;

const CALLBACK_RE = /^(cancel|processing):(.{1,48})$/;

export function parseTelegramCallbackData(
  raw: string,
): { ok: true; data: ParsedOrderCallback } | { ok: false; error: string } {
  const trimmed = raw.trim();
  const match = CALLBACK_RE.exec(trimmed);
  if (!match) {
    return { ok: false, error: "invalid_callback_data" };
  }
  const parsed = parsedCallbackSchema.safeParse({
    action: match[1],
    orderId: match[2],
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_callback_data" };
  }
  return { ok: true, data: parsed.data };
}

export function serializeOrderCallback(
  action: OrderCallbackAction,
  orderId: string,
): string {
  return `${action}:${orderId}`.slice(0, 64);
}
