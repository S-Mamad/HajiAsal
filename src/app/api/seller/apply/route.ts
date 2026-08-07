import { NextResponse } from "next/server";
import { z } from "zod";
import {
  clearSellerApplyCookie,
  getSellerApplySessionFromRequest,
} from "@/lib/server/seller-apply-session";
import {
  createSellerApplicationAsync,
} from "@/lib/server/seller-applications-store";
import { getSellerByPhoneAsync } from "@/lib/server/sellers";
import {
  isAtLeast18,
  isNonEmptyText,
  isValidBankCard,
  isValidNationalId,
  looksLikeUploadUrl,
  normalizeDigits,
  parseBirthDate,
} from "@/lib/seller/apply-validation";

const submitSchema = z.object({
  fullName: z.string().min(2).max(120),
  nationalId: z.string().min(10).max(15),
  birthDate: z.string().min(8).max(32),
  address: z.string().min(5).max(1000),
  bankCard: z.string().min(16).max(32),
  productsIntro: z.string().min(10).max(4000),
  nationalIdFrontUrl: z.string().min(8).max(512),
  nationalIdBackUrl: z.string().max(512).optional().nullable(),
  commitmentLetterUrl: z.string().min(8).max(512),
  termsAccepted: z.literal(true),
});

export async function GET(request: Request) {
  const session = getSellerApplySessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ authenticated: false });
  }
  return NextResponse.json({
    authenticated: true,
    phone: session.phone,
  });
}

export async function POST(request: Request) {
  const session = getSellerApplySessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, error: "ابتدا شماره موبایل را تأیید کنید" },
      { status: 401 },
    );
  }

  try {
    const body = await request.json().catch(() => null);
    const parsed = submitSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "اطلاعات فرم نامعتبر است" },
        { status: 400 },
      );
    }

    const data = parsed.data;
    if (!isNonEmptyText(data.fullName, 2, 120)) {
      return NextResponse.json(
        { success: false, error: "نام و نام خانوادگی نامعتبر است" },
        { status: 400 },
      );
    }

    const nationalId = normalizeDigits(data.nationalId);
    if (!isValidNationalId(nationalId)) {
      return NextResponse.json(
        { success: false, error: "کد ملی نامعتبر است" },
        { status: 400 },
      );
    }

    const birth = parseBirthDate(data.birthDate);
    if (!birth) {
      return NextResponse.json(
        { success: false, error: "تاریخ تولد نامعتبر است" },
        { status: 400 },
      );
    }
    if (!isAtLeast18(birth)) {
      return NextResponse.json(
        { success: false, error: "فروشنده باید حداقل ۱۸ سال تمام داشته باشد" },
        { status: 400 },
      );
    }

    const bankCard = normalizeDigits(data.bankCard);
    if (!isValidBankCard(bankCard)) {
      return NextResponse.json(
        { success: false, error: "شماره کارت بانکی نامعتبر است" },
        { status: 400 },
      );
    }

    if (!looksLikeUploadUrl(data.nationalIdFrontUrl)) {
      return NextResponse.json(
        { success: false, error: "تصویر کارت ملی (رو) نامعتبر است" },
        { status: 400 },
      );
    }
    if (!looksLikeUploadUrl(data.commitmentLetterUrl)) {
      return NextResponse.json(
        { success: false, error: "تصویر تعهدنامه نامعتبر است" },
        { status: 400 },
      );
    }
    const backUrl = data.nationalIdBackUrl?.trim() || null;
    if (backUrl && !looksLikeUploadUrl(backUrl)) {
      return NextResponse.json(
        { success: false, error: "تصویر کارت ملی (پشت) نامعتبر است" },
        { status: 400 },
      );
    }

    const existingSeller = await getSellerByPhoneAsync(session.phone);
    if (existingSeller) {
      return NextResponse.json(
        {
          success: false,
          error: "این شماره قبلاً به‌عنوان فروشنده ثبت شده است",
        },
        { status: 409 },
      );
    }

    const app = await createSellerApplicationAsync({
      fullName: data.fullName.trim(),
      phone: session.phone,
      nationalId,
      birthDate: data.birthDate.slice(0, 10),
      address: data.address.trim(),
      bankCard,
      productsIntro: data.productsIntro.trim(),
      nationalIdFrontUrl: data.nationalIdFrontUrl,
      nationalIdBackUrl: backUrl,
      commitmentLetterUrl: data.commitmentLetterUrl,
      termsAcceptedAt: new Date().toISOString(),
    });

    const response = NextResponse.json({
      success: true,
      applicationId: app.id,
      message: "درخواست شما ثبت شد و پس از بررسی نتیجه اعلام می‌شود.",
    });
    clearSellerApplyCookie(response);
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    const status = message.includes("در انتظار") ? 409 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
