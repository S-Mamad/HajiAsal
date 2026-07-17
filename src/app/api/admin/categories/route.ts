import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  getAllCategoriesAsync,
  upsertCategoryAsync,
  deleteCategoryAsync,
} from "@/lib/server/categories";
import { logAdminAction } from "@/lib/server/audit-log";

const categorySchema = z.object({
  id: z.string().min(1),
  slug: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().default(0),
});

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const categories = await getAllCategoriesAsync();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = categorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر" }, { status: 400 });
    }

    const category = await upsertCategoryAsync(parsed.data);
    if (!category) {
      return NextResponse.json(
        {
          error:
            "برای افزودن/ویرایش دسته، اتصال Supabase لازم است. فعلاً فقط لیست ثابت نمایش داده می‌شود.",
        },
        { status: 503 },
      );
    }

    await logAdminAction({
      action: "category.upsert",
      entityType: "category",
      entityId: category.id,
    });

    return NextResponse.json({ success: true, category });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }

  const ok = await deleteCategoryAsync(id);
  if (!ok) {
    return NextResponse.json({ error: "خطا در حذف" }, { status: 500 });
  }

  await logAdminAction({
    action: "category.delete",
    entityType: "category",
    entityId: id,
  });

  return NextResponse.json({ success: true });
}
