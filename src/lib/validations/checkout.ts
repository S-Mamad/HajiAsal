import { z } from "zod";

const phoneRegex = /^09\d{9}$/;

export const checkoutSchema = z.object({
  fullName: z
    .string()
    .min(3, "نام باید حداقل ۳ کاراکتر باشد")
    .max(100, "نام نباید بیش از ۱۰۰ کاراکتر باشد"),
  phone: z
    .string()
    .regex(phoneRegex, "شماره موبایل باید ۱۱ رقم و با ۰۹ شروع شود"),
  province: z.string().min(2, "استان را وارد کنید"),
  city: z.string().min(2, "شهر را وارد کنید"),
  address: z
    .string()
    .min(10, "آدرس باید حداقل ۱۰ کاراکتر باشد")
    .max(500, "آدرس نباید بیش از ۵۰۰ کاراکتر باشد"),
  postalCode: z
    .string()
    .regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"),
  notes: z.string().max(500, "یادداشت نباید بیش از ۵۰۰ کاراکتر باشد").optional(),
});

export const checkoutApiSchema = z.object({
  customer: checkoutSchema,
  items: z
    .array(
      z.object({
        productId: z.string(),
        slug: z.string(),
        title: z.string(),
        image: z.string(),
        weight: z.object({
          label: z.string(),
          grams: z.number(),
          price: z.number(),
        }),
        quantity: z.number().min(1).max(99),
      }),
    )
    .min(1, "سبد خرید خالی است"),
  subtotal: z.number().min(0),
  shipping: z.number().min(0),
  total: z.number().min(0),
  paymentMethod: z.enum(["cod", "card_to_card", "online"]).optional(),
  shippingMethod: z.string().optional(),
});

export type CheckoutSchemaType = z.infer<typeof checkoutSchema>;
export type CheckoutApiSchemaType = z.infer<typeof checkoutApiSchema>;
