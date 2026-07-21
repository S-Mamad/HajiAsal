import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { getAllProductsAsync } from "@/lib/server/products-store";

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "products.import_export");
  if (!gate.ok) return gate.response;

  const products = await getAllProductsAsync({
    scope: "admin",
    includeTrash: false,
    status: "all",
  });

  const headers = [
    "id",
    "slug",
    "title",
    "shortDescription",
    "category",
    "categoryLabel",
    "status",
    "inStock",
    "stockQty",
    "sku",
    "discountPrice",
    "minPrice",
    "images",
    "weightOptions",
  ];

  const lines = [headers.join(",")];
  for (const p of products) {
    const prices = p.weightOptions.map((w) => w.price);
    const minPrice = prices.length ? Math.min(...prices) : "";
    lines.push(
      [
        p.id,
        p.slug,
        p.title,
        p.shortDescription,
        p.category,
        p.categoryLabel,
        p.status ?? "active",
        String(p.inStock),
        p.stockQty != null ? String(p.stockQty) : "",
        p.sku ?? "",
        p.discountPrice != null ? String(p.discountPrice) : "",
        String(minPrice),
        (p.images ?? []).join("|"),
        JSON.stringify(p.weightOptions),
      ]
        .map((v) => escapeCsv(String(v)))
        .join(","),
    );
  }

  const csv = "\uFEFF" + lines.join("\n");
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="hajiasal-products.csv"',
    },
  });
}
