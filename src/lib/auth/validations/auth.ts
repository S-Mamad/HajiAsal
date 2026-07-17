import { z } from "zod";
import { isValidIranPhone } from "@/lib/auth/phone";

export const phoneSchema = z
  .string()
  .min(10, "شماره موبایل نامعتبر")
  .refine(isValidIranPhone, "شماره موبایل نامعتبر");

export const otpSendSchema = z.object({
  phone: phoneSchema,
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z.string().regex(/^\d{4,10}$/, "کد تأیید نامعتبر است"),
});

export const registerSchema = z.object({
  phone: phoneSchema,
  fullName: z.string().min(2, "نام الزامی است"),
  email: z.string().email("ایمیل نامعتبر").optional().or(z.literal("")),
  newsletterOptIn: z.boolean().optional(),
});

export const emailLoginSchema = z.object({
  email: z.string().email("ایمیل نامعتبر"),
  password: z.string().min(8, "رمز عبور حداقل ۸ کاراکتر"),
});
