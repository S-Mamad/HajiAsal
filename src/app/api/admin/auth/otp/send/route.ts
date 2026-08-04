import { NextResponse } from "next/server";
import { handlePanelOtpSend } from "@/lib/auth/panel-otp";
import {
  ensurePrimaryAdmins,
  findAdminUserByPhone,
} from "@/lib/server/admin-auth";

export async function POST(request: Request) {
  await ensurePrimaryAdmins();
  return handlePanelOtpSend(request, "admin", async (phone) => {
    const user = await findAdminUserByPhone(phone);
    return Boolean(user && user.status === "active");
  });
}
