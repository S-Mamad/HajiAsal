import { NextResponse } from "next/server";
import { getFaqItems } from "@/lib/server/site-settings";

export async function GET() {
  return NextResponse.json({ faq: await getFaqItems() });
}
