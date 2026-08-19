"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ProductImage } from "@/components/ui/ProductImage";
import { hajiasalPath } from "@/lib/paths";
import type { CategoryRecord } from "@/lib/server/categories";

const listVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 18,
    scale: 0.97,
  },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.55,
      ease: [0.32, 0.72, 0, 1] as const,
    },
  },
};

type CategoryGridTrackProps = {
  categories: CategoryRecord[];
};

function CategoryCard({ category }: { category: CategoryRecord }) {
  return (
    <Link
      href={`${hajiasalPath("/shop")}?category=${category.id}`}
      className="group relative block w-[148px] overflow-hidden rounded-2xl border border-border shadow-[0_12px_32px_-20px_rgba(28,25,23,0.22)] transition-[border-color,box-shadow] duration-500 hover:border-gold/35 hover:shadow-[0_16px_40px_-18px_rgba(161,98,7,0.2)] sm:w-[188px]"
    >
      <div className="relative aspect-[3/4] sm:aspect-[4/5]">
        <ProductImage
          src={category.image || "/images/hajiasal/hero-studio.webp"}
          alt={category.homeLabel || category.name}
          fill
          sizes="188px"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-3">
          <h3 className="text-xs font-bold text-white sm:text-sm">
            {category.homeLabel || category.name}
          </h3>
          {category.description ? (
            <p className="mt-0.5 hidden text-[10px] text-white/75 sm:line-clamp-1 sm:block">
              {category.description}
            </p>
          ) : null}
        </div>
      </div>
    </Link>
  );
}

export function CategoryGridTrack({ categories }: CategoryGridTrackProps) {
  const reduced = useReducedMotion();
  const listClassName =
    "scrollbar-hide -mx-1 flex list-none gap-3 overflow-x-auto px-1 pb-2 snap-x snap-mandatory touch-pan-x md:gap-4";

  if (reduced) {
    return (
      <ul role="list" className={listClassName}>
        {categories.map((category) => (
          <li key={category.id} className="shrink-0 snap-start">
            <CategoryCard category={category} />
          </li>
        ))}
      </ul>
    );
  }

  return (
    <motion.ul
      role="list"
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-48px" }}
      variants={listVariants}
      className={listClassName}
    >
      {categories.map((category) => (
        <motion.li
          key={category.id}
          variants={itemVariants}
          className="shrink-0 snap-start"
        >
          <CategoryCard category={category} />
        </motion.li>
      ))}
    </motion.ul>
  );
}
