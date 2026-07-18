import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { getAllNewsletterSubscribers } from "@/lib/server/newsletter";

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "newsletter.view");
  if (!__gate.ok) return __gate.response;

  const subscribers = await getAllNewsletterSubscribers();
  return NextResponse.json({ subscribers, total: subscribers.length });
}
