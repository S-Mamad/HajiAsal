import { NextResponse } from "next/server";
import { getSiteSettings } from "@/lib/server/site-settings";

export async function GET() {
  const settings = await getSiteSettings();
  return NextResponse.json({
    categories: settings.categories,
    shippingCost: settings.shippingCost,
  });
}
