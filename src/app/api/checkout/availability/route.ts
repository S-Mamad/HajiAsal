import { NextResponse } from "next/server";
import { isSnappayConfigured } from "@/lib/server/snappay";
import { isZarinpalConfigured } from "@/lib/server/zarinpal";

export async function GET() {
  return NextResponse.json({
    zarinpal: isZarinpalConfigured(),
    snappay: isSnappayConfigured(),
  });
}
