import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import { getContactMessagesBySource } from "@/lib/server/newsletter";

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "messages.view");
  if (!__gate.ok) return __gate.response;

  const messages = await getContactMessagesBySource("hajiasal");
  return NextResponse.json({ messages });
}

export async function PATCH(request: Request) {
  const __gate = await gateAdmin(request, "messages.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const { id, read, adminNote } = body as {
      id: string;
      read?: boolean;
      adminNote?: string;
    };

    if (!id) {
      return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
    }

    const { markContactMessageRead, updateContactMessageNote } = await import(
      "@/lib/server/newsletter"
    );

    if (read) await markContactMessageRead(id);
    if (adminNote !== undefined) await updateContactMessageNote(id, adminNote);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
