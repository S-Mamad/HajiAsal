import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/server/site-settings";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const settings = await updateSiteSettings(body);
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
