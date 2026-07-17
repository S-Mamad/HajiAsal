import type { Metadata } from "next";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { hajiasalPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "بازیابی رمز",
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout title="بازیابی رمز عبور" subtitle="به‌زودی فعال می‌شود">
      <p className="mb-6 text-sm text-muted">
        فعلاً از ورود با موبایل استفاده کنید. بازیابی رمز ایمیل به‌زودی اضافه می‌شود.
      </p>
      <Link
        href={hajiasalPath("/login")}
        className="text-sm font-medium text-amber hover:underline"
      >
        بازگشت به ورود
      </Link>
    </AuthLayout>
  );
}
