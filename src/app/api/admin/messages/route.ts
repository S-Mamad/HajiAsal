import { NextResponse } from "next/server";
import { isAdminRequestAuthenticatedAsync } from "@/lib/server/admin";
import { getContactMessagesBySource } from "@/lib/server/newsletter";

export async function GET(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

  const messages = await getContactMessagesBySource("hajiasal");
  return NextResponse.json({ messages });
}

export async function PATCH(request: Request) {
  if (!(await isAdminRequestAuthenticatedAsync(request))) {
    return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 401 });
  }

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
