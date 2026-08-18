import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { loadAdminPanelSession } from "@/lib/auth/admin-panel-session";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { PanelAccessDenied } from "@/components/auth/PanelAccessDenied";
import { hajiasalPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "پنل مدیریت",
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await loadAdminPanelSession(hajiasalPath("/admin/dashboard"));
  if (state.kind === "login") {
    redirect(state.loginUrl);
  }
  if (state.kind === "denied") {
    return <PanelAccessDenied panelLabel="پنل مدیریت" />;
  }

  return <AdminLayout>{children}</AdminLayout>;
}
