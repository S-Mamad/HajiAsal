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

const PRODUCT_CATEGORIES = [
  "mountain",
  "thyme",
  "multifloral",
  "royal-jelly",
  "honeycomb",
  "specialty",
  "gift-set",
  "distillates",
  "rice",
  "saffron",
] as const;

const importRowSchema = z.object({
  title: z.string().min(2),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.number().positive(),
  grams: z.number().positive().default(1000),
  weightLabel: z.string().default("۱ کیلو"),
  shortDescription: z.string().optional().default(""),
  inStock: z.boolean().optional().default(true),
});

const importSchema = z.object({
  rows: z.array(importRowSchema).min(1).max(500),
  /** When false, imports stay as local drafts out of the admin queue */
  submitForReview: z.boolean().optional().default(true),
});

function parseCsvValue(raw: string): string {
  const v = raw.trim();
  if (v.startsWith('"') && v.endsWith('"')) {
    return v.slice(1, -1).replace(/""/g, '"');
  }
  return v;
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if ((ch === "," || ch === "،") && !inQuotes) {
      cells.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  cells.push(cur);
  return cells.map(parseCsvValue);
}

function parseBool(value: string): boolean {
  const v = value.trim().toLowerCase();
  if (!v) return true;
  return !(v === "0" || v === "false" || v === "no" || v === "خیر");
}

function rowsFromCsv(text: string): unknown[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const lines = normalized.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = splitCsvLine(lines[0]!).map((h) => h.trim());
  const rows: unknown[] = [];
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]!);
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => {
      obj[h] = cells[idx] ?? "";
    });
    rows.push({
      title: obj.title ?? "",
      category: obj.category ?? "",
      price: Number(obj.price),
      grams: obj.grams ? Number(obj.grams) : 1000,
      weightLabel: obj.weightLabel || "۱ کیلو",
      shortDescription: obj.shortDescription ?? "",
      inStock: parseBool(obj.inStock ?? "1"),
    });
  }
  return rows;
}

async function importRows(
  sellerId: string,
  rows: z.infer<typeof importRowSchema>[],
  submitForReview: boolean,
  ip?: string,
) {
  const errors: Array<{ index: number; message: string }> = [];
  let created = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]!;
    try {
      const id = `sp-${sellerId}-${randomUUID().slice(0, 8)}`;
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
        status: "draft",
        rating: 0,
        reviewCount: 0,
        createdAt: now,
        sellerId,
        approvalStatus: "pending",
        submittedAt: submitForReview ? now : undefined,
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
    sellerId,
    action: "tools.import",
    meta: { created, errors: errors.length },
    ip,
  });

  return { created, errors };
}

export async function POST(request: Request) {
  const gated = await gateSeller(request, "tools.import_export");
  if (!gated.ok) return gated.response;

  const contentType = request.headers.get("content-type") ?? "";
  const ip = clientIpFromRequest(request);

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل CSV لازم است" }, { status: 400 });
      }
      const text = await file.text();
      const rawRows = rowsFromCsv(text);
      const submitForReview =
        String(form.get("submitForReview") ?? "true") !== "false";
      const parsed = importSchema.safeParse({
        rows: rawRows,
        submitForReview,
      });
      if (!parsed.success) {
        return NextResponse.json(
          { error: "CSV نامعتبر است؛ ستون‌های نمونه را بررسی کنید" },
          { status: 400 },
        );
      }
      const result = await importRows(
        gated.ctx.seller.id,
        parsed.data.rows,
        parsed.data.submitForReview !== false,
        ip,
      );
      return NextResponse.json({ success: true, ...result });
    }

    const body = await request.json().catch(() => null);
    const parsed = importSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "داده import نامعتبر" }, { status: 400 });
    }

    const result = await importRows(
      gated.ctx.seller.id,
      parsed.data.rows,
      parsed.data.submitForReview !== false,
      ip,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "خطا" },
      { status: 500 },
    );
  }
}
