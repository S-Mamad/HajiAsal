import { z } from "zod";

export const weightOptionSchema = z.object({
  label: z.string().min(1),
  grams: z.number().positive(),
  price: z.number().nonnegative(),
});

export const productSeoSchema = z
  .object({
    title: z.string().optional(),
    description: z.string().optional(),
    canonical: z.string().optional(),
    ogTitle: z.string().optional(),
    ogDescription: z.string().optional(),
    ogImage: z.string().optional(),
    twitterTitle: z.string().optional(),
    twitterDescription: z.string().optional(),
    twitterImage: z.string().optional(),
    robots: z.string().optional(),
    focusKeyword: z.string().optional(),
    faq: z
      .array(z.object({ question: z.string(), answer: z.string() }))
      .optional(),
  })
  .optional();

export const productStatusSchema = z.enum([
  "active",
  "draft",
  "archived",
  "disabled",
]);

export const productCategorySchema = z.enum([
  "mountain",
  "thyme",
  "multifloral",
  "royal-jelly",
  "honeycomb",
  "specialty",
  "gift-set",
  "distillates",
  "rice",
  "saffron",
]);

export const productPatchSchema = z.object({
  title: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  longDescription: z.string().optional(),
  category: productCategorySchema.optional(),
  categoryLabel: z.string().optional(),
  images: z.array(z.string().min(1)).optional(),
  weightOptions: z.array(weightOptionSchema).optional(),
  discountPrice: z.number().nullable().optional(),
  inStock: z.boolean().optional(),
  stockQty: z.number().int().nonnegative().nullable().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  ingredients: z.string().optional(),
  shippingInfo: z.string().optional(),
  rating: z.number().optional(),
  reviewCount: z.number().optional(),
  status: productStatusSchema.optional(),
  sku: z.string().optional(),
  brandId: z.string().nullable().optional(),
  seo: productSeoSchema,
  customFields: z.record(z.string(), z.unknown()).optional(),
  deletedAt: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
  autosave: z.boolean().optional(),
});

export const productCreateSchema = z.object({
  id: z.string().min(1).optional(),
  slug: z.string().min(1),
  title: z.string().min(1),
  shortDescription: z.string().default(""),
  longDescription: z.string().default(""),
  category: productCategorySchema,
  categoryLabel: z.string().default(""),
  images: z.array(z.string().min(1)).default([]),
  weightOptions: z.array(weightOptionSchema).min(1),
  discountPrice: z.number().nullable().optional(),
  inStock: z.boolean().default(true),
  stockQty: z.number().int().nonnegative().nullable().optional(),
  isBestseller: z.boolean().optional(),
  isNew: z.boolean().optional(),
  ingredients: z.string().optional(),
  shippingInfo: z.string().optional(),
  rating: z.number().default(0),
  reviewCount: z.number().default(0),
  status: productStatusSchema.default("draft"),
  sku: z.string().optional(),
  brandId: z.string().nullable().optional(),
  seo: productSeoSchema,
  customFields: z.record(z.string(), z.unknown()).optional(),
});
