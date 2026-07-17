import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getAllReviews } from "@/lib/server/reviews";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const reviews = await getAllReviews();
  return NextResponse.json({ reviews });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, approved, adminReply } = body as {
      id: string;
      approved?: boolean;
      adminReply?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
    }

    const { moderateReview } = await import("@/lib/server/reviews");
    const review = await moderateReview(id, { approved, adminReply });
    if (!review) {
      return NextResponse.json({ error: "نظر یافت نشد" }, { status: 404 });
    }

    return NextResponse.json({ success: true, review });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
