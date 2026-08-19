"use client";

import { ProductCard } from "./ProductCard";
import { cn } from "@/lib/utils";
import type { ProductGridProps } from "../types";

export function ProductGrid({ products, className }: ProductGridProps) {
  return (
    <div className={cn("w-full min-w-0", className)}>
      <ul className="m-0 grid w-full min-w-0 list-none grid-cols-2 gap-x-2.5 gap-y-3 p-0 sm:gap-x-3 sm:gap-y-4 md:grid-cols-3 md:gap-x-5 md:gap-y-5 lg:gap-6">
        {products.map((product) => (
          <li key={product.id} className="min-w-0">
            <ProductCard product={product} />
          </li>
        ))}
      </ul>
    </div>
  );
}
