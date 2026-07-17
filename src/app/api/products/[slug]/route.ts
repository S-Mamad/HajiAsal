import { NextResponse } from "next/server";
import { getProductBySlugAsync } from "@/lib/server/products";
import { getReviewsByProduct } from "@/lib/server/reviews";

interface RouteParams {
  params: Promise<{ slug: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const product = await getProductBySlugAsync(slug);

  if (!product) {
    return NextResponse.json({ error: "محصول یافت نشد" }, { status: 404 });
  }

  const reviews = await getReviewsByProduct(product.id);

  return NextResponse.json({ product, reviews });
}
