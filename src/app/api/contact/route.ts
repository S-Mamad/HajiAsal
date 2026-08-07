import { NextResponse } from "next/server";
import { z } from "zod";
import { phoneSchema } from "@/lib/auth/validations/auth";
import { saveContactMessage } from "@/lib/server/newsletter";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";

const schema = z.object({
  name: z.string().min(2, "نام الزامی است"),
  email: z.string().email("ایمیل نامعتبر است"),
  phone: phoneSchema,
  subject: z.string().min(3, "موضوع الزامی است"),
  message: z.string().min(10, "پیام باید حداقل ۱۰ کاراکتر باشد"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = await checkRateLimitAsync(
      `contact:${ip}`,
      5,
      15 * 60 * 1000,
    );
    if (!limited.ok) {
      return NextResponse.json(
        { success: false, message: "تعداد درخواست‌ها زیاد است" },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: parsed.error.issues[0]?.message ?? "اطلاعات نامعتبر",
        },
        { status: 400 },
      );
    }

    const message = await saveContactMessage({
      ...parsed.data,
      source: "hajiasal",
    });

    return NextResponse.json({
      success: true,
      message: "پیام شما دریافت شد. به زودی پاسخ می‌دهیم.",
      id: message.id,
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}
