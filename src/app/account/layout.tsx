import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { AccountSidebar } from "@/components/auth/AccountSidebar";
import { AccountBackBar } from "@/components/account/AccountBackBar";
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
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,var(--mesh-a),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 end-0 hidden w-1/3 bg-[radial-gradient(ellipse_at_100%_30%,color-mix(in_srgb,var(--gold)_5%,transparent),transparent_65%)] lg:block"
      />

      <div className="relative mx-auto flex max-w-6xl gap-8 px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] pt-6 md:px-6 md:pt-8 lg:gap-12 lg:pb-16 lg:pt-10">
        <AccountSidebar
          initialUser={{
            fullName: profile.fullName,
            phone: profile.phone,
          }}
        />
        <main className="min-w-0 flex-1">
          <div className="lg:hidden">
            <AccountBackBar />
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}
