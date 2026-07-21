import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { can } from "@/lib/admin/permissions";
import {
  createProductAsync,
  getAllProductsAsync,
  updateProductAsync,
} from "@/lib/server/products-store";
import type { Product, ProductCategory, ProductStatus, WeightOption } from "@/types";
import { logAdminAction } from "@/lib/server/audit-log";

const mappingSchema = z.object({
  dryRun: z.boolean().default(true),
  rows: z.array(z.record(z.string(), z.string())),
  columnMap: z.object({
    slug: z.string(),
    title: z.string(),
    shortDescription: z.string().optional(),
    category: z.string().optional(),
    status: z.string().optional(),
    inStock: z.string().optional(),
    discountPrice: z.string().optional(),
    images: z.string().optional(),
    weightOptions: z.string().optional(),
    price: z.string().optional(),
    sku: z.string().optional(),
  }),
});

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQuotes = false;
      } else cell += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") cell += ch;
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim()));
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "products.import_export");
  if (!gate.ok) return gate.response;

  try {
    const contentType = request.headers.get("content-type") ?? "";
    let payload: z.infer<typeof mappingSchema>;

    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      const dryRun = form.get("dryRun") !== "false";
      const mapRaw = form.get("columnMap");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل الزامی است" }, { status: 400 });
      }
      const text = await file.text();
      const matrix = parseCsv(text.replace(/^\uFEFF/, ""));
      if (matrix.length < 2) {
        return NextResponse.json({ error: "CSV خالی است" }, { status: 400 });
      }
      const headers = matrix[0]!.map((h) => h.trim());
      const rows = matrix.slice(1).map((cells) => {
        const obj: Record<string, string> = {};
        headers.forEach((h, i) => {
          obj[h] = cells[i] ?? "";
        });
        return obj;
      });
      const columnMap = mapRaw
        ? (JSON.parse(String(mapRaw)) as z.infer<
            typeof mappingSchema
          >["columnMap"])
        : {
            slug: "slug",
            title: "title",
            shortDescription: "shortDescription",
            category: "category",
            status: "status",
            inStock: "inStock",
            discountPrice: "discountPrice",
            images: "images",
            weightOptions: "weightOptions",
            price: "minPrice",
            sku: "sku",
          };
      payload = { dryRun, rows, columnMap };
    } else {
      const body = await request.json();
      const parsed = mappingSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "اطلاعات نامعتبر است" },
          { status: 400 },
        );
      }
      payload = parsed.data;
    }

    const existing = await getAllProductsAsync({
      scope: "admin",
      includeTrash: true,
      status: "all",
    });
    const bySlug = new Map(existing.map((p) => [p.slug, p]));

    const report = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as string[],
      preview: [] as Array<{ slug: string; action: string }>,
    };

    for (const row of payload.rows) {
      const map = payload.columnMap;
      const slug = (row[map.slug] ?? "").trim();
      const title = (row[map.title] ?? "").trim();
      if (!slug || !title) {
        report.skipped += 1;
        report.errors.push("ردیف بدون slug یا title");
        continue;
      }

      let weightOptions: WeightOption[] = [
        { label: "۱ کیلو", grams: 1000, price: 0 },
      ];
      if (map.weightOptions && row[map.weightOptions]) {
        try {
          weightOptions = JSON.parse(row[map.weightOptions]!) as WeightOption[];
        } catch {
          report.errors.push(`وزن نامعتبر برای ${slug}`);
        }
      } else if (map.price && row[map.price]) {
        const price = Number(row[map.price]);
        if (Number.isFinite(price)) {
          weightOptions = [{ label: "۱ کیلو", grams: 1000, price }];
        }
      }

      const images =
        map.images && row[map.images]
          ? row[map.images]!
              .split("|")
              .map((s) => s.trim())
              .filter(Boolean)
          : [];

      const category = ((map.category && row[map.category]) ||
        "mountain") as ProductCategory;
      const statusRaw = (map.status && row[map.status]) || "draft";
      let status: ProductStatus =
        statusRaw === "active" ||
        statusRaw === "archived" ||
        statusRaw === "disabled"
          ? statusRaw
          : "draft";
      if (
        status === "active" &&
        !can(gate.ctx.role, "products.publish")
      ) {
        status = "draft";
        report.errors.push(
          `انتشار برای ${slug} بدون دسترسی publish به پیش‌نویس تبدیل شد`,
        );
      }
      const inStock =
        map.inStock && row[map.inStock]
          ? !["0", "false", "خیر", "no"].includes(
              row[map.inStock]!.toLowerCase(),
            )
          : true;
      let discountPrice =
        map.discountPrice && row[map.discountPrice]
          ? Number(row[map.discountPrice])
          : undefined;
      const canEditPrice = can(gate.ctx.role, "products.edit_price");
      const found = bySlug.get(slug);

      if (!canEditPrice) {
        const touchedPrice =
          (map.price && row[map.price]) ||
          (map.discountPrice && row[map.discountPrice]) ||
          (map.weightOptions && row[map.weightOptions]);
        if (touchedPrice) {
          report.errors.push(
            `قیمت برای ${slug} بدون دسترسی edit_price نادیده گرفته شد`,
          );
        }
        if (found) {
          weightOptions = found.weightOptions;
          discountPrice = found.discountPrice;
        } else {
          weightOptions = [{ label: "۱ کیلو", grams: 1000, price: 0 }];
          discountPrice = undefined;
        }
      }

      const sku = map.sku && row[map.sku] ? row[map.sku] : undefined;
      const action = found ? "update" : "create";
      report.preview.push({ slug, action });

      if (payload.dryRun) continue;

      if (found) {
        await updateProductAsync(found.id, {
          title,
          shortDescription:
            (map.shortDescription && row[map.shortDescription]) ||
            found.shortDescription,
          category,
          categoryLabel: category,
          images: images.length ? images : found.images,
          weightOptions,
          inStock,
          discountPrice: Number.isFinite(discountPrice)
            ? discountPrice
            : found.discountPrice,
          status,
          sku: sku ?? found.sku,
        });
        report.updated += 1;
      } else {
        const product: Product = {
          id: `imp_${randomUUID().slice(0, 8)}`,
          slug,
          title,
          shortDescription:
            (map.shortDescription && row[map.shortDescription]) || "",
          longDescription: "",
          category,
          categoryLabel: category,
          images,
          weightOptions,
          inStock,
          discountPrice: Number.isFinite(discountPrice)
            ? discountPrice
            : undefined,
          rating: 0,
          reviewCount: 0,
          status,
          sku,
          customFields: {},
          seo: {},
        };
        await createProductAsync(product);
        report.created += 1;
      }
    }

    if (!payload.dryRun) {
      await logAdminAction({
        action: "product.import",
        entityType: "product",
        payload: report,
        adminUserId: gate.ctx.user?.id,
      });
    }

    return NextResponse.json({
      success: true,
      dryRun: payload.dryRun,
      ...report,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "خطای سرور";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
