import { NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  findProfileById,
  updateProfile,
} from "@/lib/server/profiles";

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const profile = await findProfileById(session.userId);
  if (!profile) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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

export async function PATCH(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const profile = await updateProfile(session.userId, {
    fullName: body.fullName,
    email: body.email ?? null,
    newsletterOptIn: body.newsletterOptIn,
  });

  if (!profile) {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
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
