import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getAllSlugsAsync,
  getProductBySlugAsync,
  getRelatedProductsAsync,
} from "@/lib/server/products-store";
import { getReviewsByProduct } from "@/lib/server/reviews";
import {
  buildProductJsonLd,
  buildBreadcrumbJsonLd,
} from "@/lib/seo";
import { ProductDetailClient } from "@/components/product/ProductDetailClient";
import { hajiasalCanonical, hajiasalPath } from "@/lib/paths";
import { serializeJsonLd } from "@/lib/json-ld";

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const slugs = await getAllSlugsAsync();
    return slugs.map((slug) => ({ slug }));
  } catch {
    // Offline / DB-down builds: skip SSG for product pages
    return [];
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const product = await getProductBySlugAsync(slug);
    if (!product) return { title: "محصول یافت نشد" };

    return {
      title: product.title,
      description: product.shortDescription,
      openGraph: {
        title: product.title,
        description: product.shortDescription,
        images: product.images,
      },
      alternates: { canonical: hajiasalCanonical(`/product/${slug}`) },
    };
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

  const productJsonLd = buildProductJsonLd(product);
  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: "خانه", href: hajiasalPath() },
    { name: "فروشگاه", href: hajiasalPath("/shop") },
    { name: product.title, href: hajiasalPath(`/product/${slug}`) },
  ]);

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
      <ProductDetailClient
        product={product}
        relatedProducts={relatedProducts}
        initialReviews={initialReviews}
      />
    </>
  );
}
