import { NextResponse } from "next/server";
import { isSnappayConfigured } from "@/lib/server/snappay";
import { isZibalConfigured, isZibalSandboxMerchant } from "@/lib/server/zibal";

export async function GET() {
  return NextResponse.json({
    zibal: isZibalConfigured(),
    zibalSandbox: isZibalSandboxMerchant(),
    snappay: isSnappayConfigured(),
    /** @deprecated use `zibal` — kept false for older clients */
    zarinpal: false,
  });
}
