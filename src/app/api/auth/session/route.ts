import { NextResponse } from "next/server";
import { applySessionCookieToResponse, getSessionFromRequest } from "@/lib/auth/session";
import { getSessionTokenFromRequest } from "@/lib/auth/session-edge";
import { findProfileById } from "@/lib/server/profiles";
import { isProfileComplete } from "@/lib/auth/profile-complete";
import { getSellerByPhoneAsync } from "@/lib/server/sellers";
import { sellerPublicUrl } from "@/lib/paths";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ user: null, profileComplete: false }, { status: 401 });
  }

  const profile = await findProfileById(session.userId);
  if (!profile) {
    return NextResponse.json({ user: null, profileComplete: false }, { status: 401 });
  }

  const profileComplete = isProfileComplete(profile.fullName);
  const seller = await getSellerByPhoneAsync(profile.phone);
  const sellerPanel =
    seller?.status === "active"
      ? {
          url: `${sellerPublicUrl()}/seller`,
          shopName: seller.shopName,
          status: seller.status as string,
        }
      : null;

  const response = NextResponse.json({
    user: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.fullName,
      email: profile.email,
      newsletterOptIn: profile.newsletterOptIn,
    },
    profileComplete,
    sellerPanel,
  });

  // Re-issue Domain=.parent so older host-only cookies start working on panel subdomains.
  const token = getSessionTokenFromRequest(request);
  if (token) {
    applySessionCookieToResponse(response, token);
  }

  return response;
}
