import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/server/admin";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { hajiasalPath } from "@/lib/paths";

export default async function AdminPage() {
  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    redirect(hajiasalPath("/admin/dashboard"));
  }

  return <AdminLogin />;
}
