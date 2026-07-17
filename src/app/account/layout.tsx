import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { AccountSidebar } from "@/components/auth/AccountSidebar";
import { hajiasalPath } from "@/lib/paths";

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

  return (
    <div className="mx-auto flex max-w-6xl gap-10 px-4 py-24 md:px-6 md:py-32 pb-28 lg:pb-32">
      <AccountSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
