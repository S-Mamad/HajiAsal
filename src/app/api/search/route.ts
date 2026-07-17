import { NextResponse } from "next/server";
import { searchProductsAsync } from "@/lib/server/products-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") ?? "";

  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const results = (await searchProductsAsync(q)).slice(0, 12);
  return NextResponse.json({ results, query: q, total: results.length });
}
