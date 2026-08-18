import { NextResponse } from "next/server";
import { isTrustedMutationOrigin } from "@/lib/auth/request-origin";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  createPanelHandoffTicket,
  panelHandoffConsumeUrl,
  resolvePanelHandoffTarget,
} from "@/lib/auth/panel-handoff";

export async function POST(request: Request) {
  if (!isTrustedMutationOrigin(request)) {
    return NextResponse.json(
      { success: false, message: "درخواست نامعتبر است" },
      { status: 403 },
    );
  }

  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { success: false, message: "نشست معتبر نیست" },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    redirect?: unknown;
  } | null;
  const target = resolvePanelHandoffTarget(
    typeof body?.redirect === "string" ? body.redirect : null,
  );
  if (!target) {
    return NextResponse.json(
      { success: false, message: "مقصد پنل نامعتبر است" },
      { status: 400 },
    );
  }

  const ticket = createPanelHandoffTicket({
    userId: session.userId,
    phone: session.phone,
    fullName: session.fullName,
    aud: target.aud,
    next: target.next,
  });

  return NextResponse.json({
    success: true,
    url: panelHandoffConsumeUrl(target.origin, target.aud, ticket),
  });
}
