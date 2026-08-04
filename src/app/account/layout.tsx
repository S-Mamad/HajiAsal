import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { AccountSidebar } from "@/components/auth/AccountSidebar";
import { hajiasalPath } from "@/lib/paths";
import { isProfileComplete } from "@/lib/auth/profile-complete";

export const metadata: Metadata = {
  title: "حساب کاربری",
  robots: { index: false, follow: false },
};

export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSessionFromCookies();
  if (!session) {
    redirect(`${hajiasalPath("/login")}?redirect=${hajiasalPath("/account")}`);
  }

  const profile = await findProfileById(session.userId);
  if (!profile) {
    redirect(hajiasalPath("/login"));
  }

  if (!isProfileComplete(profile.fullName)) {
    redirect(
      `${hajiasalPath("/login")}?step=complete&redirect=${encodeURIComponent(hajiasalPath("/account"))}`,
    );
  }

  return (
    <div className="mx-auto flex max-w-6xl gap-8 px-4 pb-[calc(6.5rem+env(safe-area-inset-bottom))] pt-8 md:px-6 md:pt-10 lg:gap-10 lg:pb-16 lg:pt-12">
      <AccountSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
