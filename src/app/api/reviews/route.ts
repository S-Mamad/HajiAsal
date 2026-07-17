import { NextResponse } from "next/server";
import { z } from "zod";
import {
  GENERAL_REVIEW_PRODUCT_ID,
  getFeaturedReviewsAsync,
  getReviewsByProduct,
  createReview,
} from "@/lib/server/reviews";
import { hasPurchasedByPhone } from "@/lib/server/orders";
import { normalizePhone } from "@/lib/auth/phone";
import { checkRateLimit, getClientIp } from "@/lib/server/rate-limit";

const reviewSchema = z.object({
  productId: z.string().min(1).max(64).optional(),
  author: z.string().min(2).max(60),
  phone: z.string().min(10).max(20),
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().min(10).max(500),
  /** Honeypot — bots fill this; humans leave empty */
  website: z.string().optional(),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const productId = searchParams.get("productId");
  const featured = searchParams.get("featured");

  if (productId) {
    const reviews = await getReviewsByProduct(productId);
    return NextResponse.json({ reviews });
  }

  if (featured === "1") {
    const reviews = await getFeaturedReviewsAsync(8);
    return NextResponse.json({ reviews });
  }

  const reviews = await getFeaturedReviewsAsync(8);
  return NextResponse.json({ reviews });
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const limited = checkRateLimit(`review:${ip}`, 5, 15 * 60 * 1000);
    if (!limited.ok) {
      return NextResponse.json(
        {
          success: false,
          message: "تعداد درخواست‌ها زیاد است. کمی بعد دوباره تلاش کنید.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(limited.retryAfterSec) },
        },
      );
    }

    const body = await request.json();
    const parsed = reviewSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "اطلاعات نظر نامعتبر است" },
        { status: 400 },
      );
    }

    if (parsed.data.website && parsed.data.website.trim().length > 0) {
      return NextResponse.json({ success: true });
    }

    const phone = normalizePhone(parsed.data.phone);
    if (!phone) {
      return NextResponse.json(
        { success: false, message: "شماره موبایل نامعتبر است" },
        { status: 400 },
      );
    }

    const isBuyer = await hasPurchasedByPhone(phone);
    if (!isBuyer) {
      return NextResponse.json(
        {
          success: false,
          message:
            "فقط خریداران می‌توانند نظر ثبت کنند. شماره موبایل باید همان شماره سفارش باشد.",
        },
        { status: 403 },
      );
    }

    const review = await createReview({
      productId: parsed.data.productId ?? GENERAL_REVIEW_PRODUCT_ID,
      author: parsed.data.author,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    return NextResponse.json({
      success: true,
      message: "نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.",
      review: {
        id: review.id,
        verified: review.verified,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "خطا در ثبت نظر" },
      { status: 500 },
    );
  }
}
