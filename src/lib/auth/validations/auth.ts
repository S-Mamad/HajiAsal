import { z } from "zod";
import { isValidIranPhone, normalizePhone } from "@/lib/auth/phone";
import { normalizeOtpDigits } from "@/lib/auth/otp-digits";

/** Accepts messy input; outputs canonical `09xxxxxxxxx`. */
export const phoneSchema = z
  .string()
  .refine(isValidIranPhone, "شماره موبایل نامعتبر")
  .transform((v) => normalizePhone(v)!);

export const otpSendSchema = z.object({
  phone: phoneSchema,
  deviceId: z.string().max(64).optional(),
});

export const otpVerifySchema = z.object({
  phone: phoneSchema,
  code: z
    .string()
    .transform((v) => normalizeOtpDigits(v))
    .refine((v) => /^\d{4,10}$/.test(v), "کد تأیید نامعتبر است"),
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
