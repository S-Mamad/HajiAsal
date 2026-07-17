import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getAllProfilesWithStats } from "@/lib/server/profiles";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const customers = await getAllProfilesWithStats();
  return NextResponse.json({ customers });
}
