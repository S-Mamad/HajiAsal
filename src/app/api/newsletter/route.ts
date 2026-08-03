import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeNewsletter } from "@/lib/server/newsletter";
import { checkRateLimitAsync, getClientIp } from "@/lib/server/rate-limit";

const schema = z.object({
  email: z.string().email("ایمیل نامعتبر است"),
});

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = await checkRateLimitAsync(
      `newsletter:${ip}`,
      8,
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
        { success: false, message: "ایمیل نامعتبر است" },
        { status: 400 },
      );
    }

    const isNew = await subscribeNewsletter(parsed.data.email);

    return NextResponse.json({
      success: true,
      message: isNew
        ? "با موفقیت در خبرنامه عضو شدید"
        : "این ایمیل قبلاً ثبت شده است",
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطای سرور" },
      { status: 500 },
    );
  }
}
