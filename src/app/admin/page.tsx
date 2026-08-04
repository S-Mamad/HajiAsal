import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/server/admin";
import { ensurePrimaryAdmins } from "@/lib/server/admin-auth";
import { AdminLogin } from "@/components/admin/AdminLogin";
import { hajiasalPath } from "@/lib/paths";

export default async function AdminPage() {
  try {
    await ensurePrimaryAdmins();
  } catch (error) {
    console.error(
      "[admin] ensurePrimaryAdmins:",
      error instanceof Error ? error.message : error,
    );
  }

  const authenticated = await isAdminAuthenticated();

  if (authenticated) {
    redirect(hajiasalPath("/admin/dashboard"));
  }

  return <AdminLogin />;
}
