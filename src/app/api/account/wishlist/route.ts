import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  getWishlistProductIds,
  mergeWishlist,
  setWishlist,
} from "@/lib/server/profiles";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const productIds = await getWishlistProductIds(session.userId);
  return NextResponse.json({ productIds });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json()) as {
    productIds?: string[];
    merge?: boolean;
  };

  if (!body.productIds) {
    return NextResponse.json({ error: "productIds required" }, { status: 400 });
  }

  if (body.merge) {
    const productIds = await mergeWishlist(session.userId, body.productIds);
    return NextResponse.json({ success: true, productIds });
  }

  await setWishlist(session.userId, body.productIds);
  return NextResponse.json({ success: true, productIds: body.productIds });
}
