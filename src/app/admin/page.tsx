import { redirect } from "next/navigation";
import { loadAdminPanelSession } from "@/lib/auth/admin-panel-session";
import { PanelAccessDenied } from "@/components/auth/PanelAccessDenied";
import { hajiasalPath } from "@/lib/paths";

export default async function AdminPage() {
  const state = await loadAdminPanelSession(hajiasalPath("/admin/dashboard"));
  if (state.kind === "login") {
    redirect(state.loginUrl);
  }
  if (state.kind === "ok") {
    redirect(hajiasalPath("/admin/dashboard"));
  }
  return <PanelAccessDenied panelLabel="پنل مدیریت" />;
}
