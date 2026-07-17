import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      message: "ورود با ایمیل به‌زودی فعال می‌شود. از موبایل استفاده کنید.",
    },
    { status: 501 },
  );
}
