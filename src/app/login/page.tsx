import type { Metadata } from "next";
import { LoginPageClient } from "@/components/auth/LoginPageClient";

export const metadata: Metadata = {
  title: "ورود",
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginPageClient />;
}
