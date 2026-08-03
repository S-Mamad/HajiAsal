import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createMedia,
  deleteMedia,
  listMedia,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

const MAX_BYTES = 5_000_000;

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

const urlSchema = z.object({
  filename: z.string().min(1),
  originalName: z.string().min(1),
  mimeType: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  url: z.string().min(1),
  altText: z.string().nullable().optional(),
  folder: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "media.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listMedia() });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "media.manage");
  if (!gate.ok) return gate.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل لازم است" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          { error: "فقط تصویر JPEG/PNG/WebP/GIF" },
          { status: 400 },
        );
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "حداکثر حجم ۵ مگابایت" },
          { status: 400 },
        );
      }

      const id = randomUUID();
      const folderRaw = String(form.get("folder") ?? "products").trim() || "products";
      const folder = folderRaw.replace(/[^\w\-آ-ی]+/gi, "_").slice(0, 64);
      const safeName = (file.name || "upload").replace(/[^\w.\-آ-ی ]+/gi, "_");
      const filename = `${id}${extForMime(file.type)}`;
      const dir = path.join(process.cwd(), "public", "uploads", "admin", folder);
      await mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, filename), buffer);
      const url = `/uploads/admin/${folder}/${filename}`;

      const item = await createMedia({
        filename,
        originalName: safeName,
        mimeType: file.type,
        sizeBytes: file.size,
        url,
        folder,
        uploadedBy: gate.ctx.user?.id,
      });

      await logAdminAction({
        action: "media.upload",
        entityType: "media",
        entityId: item.id,
        adminUserId: gate.ctx.user?.id,
      });

      return NextResponse.json({ item });
    }

    const parsed = urlSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    if (
      parsed.data.url.startsWith("data:") ||
      parsed.data.url.startsWith("blob:")
    ) {
      return NextResponse.json(
        {
          error:
            "آپلود data/blob مجاز نیست. فایل را به‌صورت multipart بفرستید یا URL عمومی بگذارید.",
        },
        { status: 400 },
      );
    }

    if (
      parsed.data.mimeType.startsWith("image/") &&
      !ALLOWED_MIME.has(parsed.data.mimeType)
    ) {
      return NextResponse.json(
        { error: "فقط تصویر JPEG/PNG/WebP/GIF" },
        { status: 400 },
      );
    }

    const item = await createMedia({
      ...parsed.data,
      uploadedBy: gate.ctx.user?.id,
    });
    await logAdminAction({
      action: "media.create",
      entityType: "media",
      entityId: item.id,
      adminUserId: gate.ctx.user?.id,
    });
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در آپلود رسانه",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "media.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await deleteMedia(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "media.delete",
    entityType: "media",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
