"use client";

import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";
import type { ProductGridProps } from "../types";

export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <div className={cn("pb-32", className)}>
      <div className="grid grid-cols-2 items-stretch gap-4 md:grid-cols-3 md:gap-5 lg:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
