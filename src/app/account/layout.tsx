import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { AccountSidebar } from "@/components/auth/AccountSidebar";
import { AccountShellFrame } from "@/components/account/AccountShellFrame";
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
    <div className="account-shell relative">
      <AccountShellFrame
        sidebar={
          <AccountSidebar
            initialUser={{
              fullName: profile.fullName,
              phone: profile.phone,
            }}
          />
        }
      >
        {children}
      </AccountShellFrame>
    </div>
  );
}
