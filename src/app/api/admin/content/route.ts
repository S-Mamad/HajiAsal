import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/server/site-settings";

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "content.view");
  if (!__gate.ok) return __gate.response;

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const __gate = await gateAdmin(request, "content.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const settings = await updateSiteSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
