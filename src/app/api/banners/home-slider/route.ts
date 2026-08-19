import { NextResponse } from "next/server";
import { getActiveHomeSliderSlides } from "@/lib/server/admin-platform-store";
import { getSiteSettings } from "@/lib/server/site-settings";
import { resolveHomeSliderSettings } from "@/lib/home-sections";

export async function GET() {
  const [slides, settings] = await Promise.all([
    getActiveHomeSliderSlides(),
    getSiteSettings(),
  ]);
  return NextResponse.json({
    slides,
    settings: resolveHomeSliderSettings(settings),
  });
}
