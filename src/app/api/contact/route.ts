import { NextResponse } from "next/server";
import { z } from "zod";
import { saveContactMessage } from "@/lib/server/newsletter";

const schema = z.object({
  name: z.string().min(2, "نام الزامی است"),
  email: z.string().email("ایمیل نامعتبر است"),
  phone: z.string().min(11, "شماره موبایل نامعتبر است"),
  subject: z.string().min(3, "موضوع الزامی است"),
  message: z.string().min(10, "پیام باید حداقل ۱۰ کاراکتر باشد"),
});

export async function POST(request: Request) {
  try {
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
