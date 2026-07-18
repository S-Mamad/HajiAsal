import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { getSellerProducts } from "@/lib/server/sellers";
import { createProductAsync } from "@/lib/server/products-store";
import { logSellerActivity } from "@/lib/server/seller-activity";
import type { Product, ProductCategory } from "@/types";

export async function GET(request: Request) {
  const gated = await gateSeller(request, "tools.import_export");
  if (!gated.ok) return gated.response;

  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("mode") ?? "export";

  if (mode === "template") {
    const csv =
      "title,category,price,grams,weightLabel,shortDescription,inStock\nعسل نمونه,specialty,450000,1000,۱ کیلو,توضیح کوتاه,1\n";
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="seller-products-template.csv"',
      },
    });
  }

  const products = await getSellerProducts(gated.ctx.seller.id);
  const header =
    "id,title,category,price,grams,weightLabel,shortDescription,inStock,approvalStatus";
  const lines = products.map((p) => {
    const w = p.weightOptions[0];
    return [
      p.id,
      JSON.stringify(p.title),
      p.category,
      w?.price ?? "",
      w?.grams ?? "",
      JSON.stringify(w?.label ?? ""),
      JSON.stringify(p.shortDescription),
      p.inStock ? 1 : 0,
      p.approvalStatus ?? "",
    ].join(",");
  });
  const csv = `\uFEFF${header}\n${lines.join("\n")}`;
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="seller-products-export.csv"',
    },
  });
}

const importSchema = z.object({
  rows: z
    .array(
      z.object({
        title: z.string().min(2),
        category: z.string().min(1),
        price: z.number().positive(),
        grams: z.number().positive().default(1000),
        weightLabel: z.string().default("۱ کیلو"),
        shortDescription: z.string().optional().default(""),
        inStock: z.boolean().optional().default(true),
      }),
    )
    .min(1)
    .max(500),
});

export async function POST(request: Request) {
  const gated = await gateSeller(request, "tools.import_export");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = importSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده import نامعتبر" }, { status: 400 });
  }

  const errors: Array<{ index: number; message: string }> = [];
  let created = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < parsed.data.rows.length; i += 1) {
    const row = parsed.data.rows[i]!;
    try {
      const id = `sp-${gated.ctx.seller.id}-${randomUUID().slice(0, 8)}`;
      const product: Product = {
        id,
        slug: `import-${id.slice(-8)}`,
        title: row.title.trim(),
        shortDescription: row.shortDescription ?? "",
        longDescription: "",
        category: row.category as ProductCategory,
        categoryLabel: row.category,
        images: [],
        weightOptions: [
          {
            label: row.weightLabel,
            grams: row.grams,
            price: row.price,
          },
        ],
        inStock: row.inStock ?? true,
        stockQty: row.inStock === false ? 0 : 1,
        rating: 0,
        reviewCount: 0,
        createdAt: now,
        sellerId: gated.ctx.seller.id,
        approvalStatus: "pending",
        submittedAt: now,
      };
      const ok = await createProductAsync(product);
      if (!ok) throw new Error("ایجاد ناموفق");
      created += 1;
    } catch (err) {
      errors.push({
        index: i,
        message: err instanceof Error ? err.message : "خطا",
      });
    }
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "tools.import",
    meta: { created, errors: errors.length },
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({ success: true, created, errors });
}
