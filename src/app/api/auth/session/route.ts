import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";
import { isProfileComplete } from "@/lib/auth/profile-complete";

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

  return NextResponse.json({
    user: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.fullName,
      email: profile.email,
      newsletterOptIn: profile.newsletterOptIn,
    },
    profileComplete,
  });
}
