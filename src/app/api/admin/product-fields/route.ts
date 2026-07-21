import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createProductFieldAsync,
  deleteProductFieldAsync,
  listProductFieldsAsync,
  updateProductFieldAsync,
} from "@/lib/server/product-fields-store";
import { logAdminAction } from "@/lib/server/audit-log";

const fieldSchema = z.object({
  key: z.string().min(1).regex(/^[a-z0-9_]+$/i),
  label: z.string().min(1),
  type: z.enum([
    "text",
    "number",
    "date",
    "select",
    "image",
    "table",
    "repeater",
  ]),
  options: z
    .object({
      choices: z.array(z.string()).optional(),
      columns: z.array(z.string()).optional(),
    })
    .optional(),
  validation: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      maxLength: z.number().optional(),
      pattern: z.string().optional(),
    })
    .optional(),
  scope: z.enum(["product", "category"]).default("product"),
  categoryId: z.string().nullable().optional(),
  sortOrder: z.number().default(0),
  isRequired: z.boolean().default(false),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "products.view");
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const categoryId = url.searchParams.get("categoryId");
  const fields = await listProductFieldsAsync({
    categoryId: categoryId || undefined,
  });
  return NextResponse.json({ fields });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "products.manage_fields");
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const parsed = fieldSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const field = await createProductFieldAsync(parsed.data);
  if (!field) {
    return NextResponse.json({ error: "خطا در ایجاد فیلد" }, { status: 500 });
  }

  await logAdminAction({
    action: "product_field.create",
    entityType: "product_field",
    entityId: field.id,
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true, field });
}

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "products.manage_fields");
  if (!gate.ok) return gate.response;

  const body = await request.json();
  const id = z.string().min(1).safeParse(body.id);
  if (!id.success) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }
  const parsed = fieldSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }

  const field = await updateProductFieldAsync(id.data, parsed.data);
  if (!field) {
    return NextResponse.json({ error: "فیلد یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: "product_field.update",
    entityType: "product_field",
    entityId: field.id,
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true, field });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "products.manage_fields");
  if (!gate.ok) return gate.response;

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  }

  const ok = await deleteProductFieldAsync(id);
  if (!ok) {
    return NextResponse.json({ error: "فیلد یافت نشد" }, { status: 404 });
  }

  await logAdminAction({
    action: "product_field.delete",
    entityType: "product_field",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });

  return NextResponse.json({ success: true });
}
