import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { findProfileById } from "@/lib/server/profiles";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const profile = await findProfileById(session.userId);
  if (!profile) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: profile.id,
      phone: profile.phone,
      fullName: profile.fullName,
      email: profile.email,
      newsletterOptIn: profile.newsletterOptIn,
    },
  });
}
