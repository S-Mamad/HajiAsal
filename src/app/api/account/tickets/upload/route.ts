import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { getSessionFromRequest } from "@/lib/auth/session";
import { validateChatFile } from "@/lib/tickets/types";

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "application/pdf") return ".pdf";
  return ".jpg";
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "فایل ارسال نشده" }, { status: 400 });
    }
    const check = validateChatFile(file);
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const id = randomUUID();
    const filename = `${id}${extForMime(file.type)}`;
    const dir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "tickets",
      session.userId,
    );
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    const url = `/uploads/tickets/${session.userId}/${filename}`;

    return NextResponse.json({
      success: true,
      file: {
        id,
        url,
        name: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در آپلود",
      },
      { status: 500 },
    );
  }
}
