import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateChatFile } from "@/lib/tickets/types";
import {
  applyUploadFolder,
  getSellerApplySessionFromRequest,
} from "@/lib/server/seller-apply-session";

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "application/pdf") return ".pdf";
  return ".jpg";
}

export async function POST(request: Request) {
  const session = getSellerApplySessionFromRequest(request);
  if (!session) {
    return NextResponse.json(
      { error: "ابتدا شماره موبایل را تأیید کنید", success: false },
      { status: 401 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    const kind = String(form.get("kind") ?? "doc");
    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "فایل ارسال نشده", success: false },
        { status: 400 },
      );
    }
    const check = validateChatFile(file);
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error, success: false },
        { status: 400 },
      );
    }

    const folder = applyUploadFolder(session.phone);
    const id = randomUUID();
    const safeKind = kind.replace(/[^a-z0-9_-]/gi, "").slice(0, 32) || "doc";
    const filename = `${safeKind}-${id}${extForMime(file.type)}`;
    const dir = path.join(
      process.cwd(),
      "public",
      "uploads",
      "seller-applications",
      folder,
    );
    await mkdir(dir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(path.join(dir, filename), buffer);
    const url = `/uploads/seller-applications/${folder}/${filename}`;

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
        success: false,
      },
      { status: 500 },
    );
  }
}
