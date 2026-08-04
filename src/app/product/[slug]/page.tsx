import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getProductBySlugAsync,
  getRelatedProductsAsync,
} from "@/lib/server/products-store";
import { getReviewsByProduct } from "@/lib/server/reviews";
import {
  buildProductMetadata,
  buildProductSeoBundle,
} from "@/lib/seo";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { serializeJsonLd } from "@/lib/json-ld";

/** Always render from live catalog so stock / new products match the API. */
export const dynamic = "force-dynamic";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlugAsync(slug);
    if (!product) return { title: "محصول یافت نشد" };
    return buildProductMetadata(product);
  } catch {
    return { title: "محصول" };
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  let product;
  try {
    product = await getProductBySlugAsync(slug);
  } catch {
    notFound();
  }
  if (!product) notFound();

  const [relatedProducts, initialReviews] = await Promise.all([
    getRelatedProductsAsync(product).catch(() => []),
    getReviewsByProduct(product.id).catch(() => []),
  ]);

  const { product: productJsonLd, breadcrumb: breadcrumbJsonLd, faq: faqJsonLd } =
    buildProductSeoBundle(product);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      ) : null}
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        initialReviews={initialReviews}
      />
    </>
  );
}
