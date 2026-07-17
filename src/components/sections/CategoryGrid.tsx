import Link from "next/link";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { ProductImage } from "@/components/ui/ProductImage";
import { hajiasalPath } from "@/lib/paths";

const siteData = site as SiteConfig;

export function CategoryGrid() {
  return (
    <section className="bg-surface py-12 md:py-24">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="mb-6 md:mb-10">
          <SectionHeading
            title="دسته‌بندی محصولات"
            subtitle="عسل مورد علاقه خود را انتخاب کنید"
            className="max-w-lg"
          />
        </Reveal>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-5">
          {siteData.categories.map((cat, i) => (
            <Reveal key={cat.id} delay={i * 0.04}>
              <Link
                href={`${hajiasalPath("/shop")}?category=${cat.id}`}
                className="group relative block overflow-hidden rounded-xl border border-border bg-surface-elevated transition-all duration-500 hover:border-gold/30 sm:rounded-2xl"
              >
                <div className="relative aspect-square sm:aspect-[4/3]">
                  <ProductImage
                    src={cat.image}
                    alt={cat.label}
                    fill
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-void via-void/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-2.5 sm:p-4">
                    <h3 className="text-xs font-bold text-primary sm:text-base">
                      {cat.label}
                    </h3>
                    <p className="mt-0.5 hidden text-xs text-secondary sm:line-clamp-1 sm:block">
                      {cat.description}
                    </p>
                  </div>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
