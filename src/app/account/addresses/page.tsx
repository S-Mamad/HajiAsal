import { getSessionFromCookies } from "@/lib/auth/session";
import { getAddressesByUserId } from "@/lib/server/profiles";
import { AddressesPageClient } from "@/components/account/AddressesPageClient";

export default async function AddressesPage() {
  const session = await getSessionFromCookies();
  const addresses = session
    ? await getAddressesByUserId(session.userId)
    : [];

  return <AddressesPageClient initialAddresses={addresses} />;
}
