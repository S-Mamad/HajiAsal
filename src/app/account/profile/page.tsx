import { getSessionFromCookies } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { ProfilePageClient } from "@/components/account/ProfilePageClient";

export default async function ProfilePage() {
  const session = await getSessionFromCookies();
  const profile = session ? await findProfileById(session.userId) : null;

  return (
    <ProfilePageClient
      initialUser={
        profile
          ? {
              fullName: profile.fullName ?? "",
              email: profile.email ?? "",
              phone: profile.phone,
              newsletterOptIn: profile.newsletterOptIn,
            }
          : null
      }
    />
  );
}
