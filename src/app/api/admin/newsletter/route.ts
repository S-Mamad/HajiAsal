import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getAllNewsletterSubscribers } from "@/lib/server/newsletter";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const subscribers = await getAllNewsletterSubscribers();
  return NextResponse.json({ subscribers, total: subscribers.length });
}
