import { NextResponse } from "next/server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  countProductsInCategoryAsync,
  deleteCategoryAsync,
  getAllCategoriesAsync,
  reassignProductsCategoryAsync,
  upsertCategoryAsync,
} from "@/lib/server/categories";
import { logAdminAction } from "@/lib/server/audit-log";

const categorySchema = z.object({
  id: z.string().min(1).max(80),
  slug: z.string().min(1).max(80),
  name: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  image: z.string().max(400).optional(),
  sortOrder: z.number().default(0),
  showOnHome: z.boolean().optional(),
  homeLabel: z.string().max(80).optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "categories.view");
  if (!gate.ok) return gate.response;

  const categories = await getAllCategoriesAsync();
  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "categories.manage");
  if (!gate.ok) return gate.response;

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
            "برای افزودن/ویرایش دسته، اتصال پایگاه‌داده لازم است. فعلاً فقط لیست ثابت نمایش داده می‌شود.",
        },
        { status: 503 },
      );
    }

    await logAdminAction({
      action: "category.upsert",
      entityType: "category",
      entityId: category.id,
    });
    revalidatePath("/", "layout");
    revalidatePath("/shop");

    return NextResponse.json({ success: true, category });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "categories.manage");
  if (!gate.ok) return gate.response;

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const reassignTo = searchParams.get("reassignTo");
  if (!id) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }

  const productCount = await countProductsInCategoryAsync(id);
  if (productCount > 0 && !reassignTo) {
    const categories = await getAllCategoriesAsync();
    return NextResponse.json(
      {
        error: `این دسته ${productCount.toLocaleString("fa-IR")} محصول دارد. ابتدا محصولات را به دسته دیگری منتقل کنید.`,
        productCount,
        categories: categories.filter((c) => c.id !== id),
      },
      { status: 409 },
    );
  }

  if (productCount > 0 && reassignTo) {
    if (reassignTo === id) {
      return NextResponse.json(
        { error: "دسته مقصد باید متفاوت باشد" },
        { status: 400 },
      );
    }
    const moved = await reassignProductsCategoryAsync(id, reassignTo);
    if (!moved) {
      return NextResponse.json(
        { error: "انتقال محصولات ناموفق بود" },
        { status: 500 },
      );
    }
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
  revalidatePath("/", "layout");
  revalidatePath("/shop");

  return NextResponse.json({ success: true });
}
