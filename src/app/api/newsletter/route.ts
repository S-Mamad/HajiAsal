import { NextResponse } from "next/server";
import { z } from "zod";
import { subscribeNewsletter } from "@/lib/server/newsletter";

const schema = z.object({
  email: z.string().email("ایمیل نامعتبر است"),
});

export async function POST(request: Request) {
  try {
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
