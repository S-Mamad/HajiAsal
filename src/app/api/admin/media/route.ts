import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  createMedia,
  deleteMedia,
  getMediaById,
  listMedia,
  updateMedia,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";
import { syncSiteMediaToLibrary } from "@/lib/server/media-sync";

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const MAX_BYTES = 5_000_000;

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  if (mime === "application/pdf") return ".pdf";
  if (mime === "image/svg+xml") return ".svg";
  return ".jpg";
}

function localPublicPathFromUrl(url: string): string | null {
  const clean = url.split("?")[0]?.trim();
  if (!clean?.startsWith("/") || clean.startsWith("//")) return null;
  if (clean.includes("..")) return null;
  return path.join(process.cwd(), "public", clean.replace(/^\//, ""));
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
  try {
    await syncSiteMediaToLibrary();
  } catch (error) {
    console.warn(
      "[media] sync failed:",
      error instanceof Error ? error.message : error,
    );
  }
  return NextResponse.json({ items: await listMedia() });
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  // Peek folder early for product-image uploads by editors without media.manage.
  let folderHint = "products";
  if (contentType.includes("multipart/form-data")) {
    try {
      const cloned = request.clone();
      const form = await cloned.formData();
      folderHint = String(form.get("folder") ?? "products").trim() || "products";
    } catch {
      /* fall through */
    }
  } else {
    try {
      const cloned = request.clone();
      const body = (await cloned.json()) as { folder?: string };
      if (body.folder) folderHint = String(body.folder);
    } catch {
      /* fall through */
    }
  }

  let gate = await gateAdmin(request, "media.manage");
  if (
    !gate.ok &&
    folderHint.replace(/[^\w\-آ-ی]+/gi, "_").slice(0, 64) === "products"
  ) {
    gate = await gateAdmin(request, "products.edit");
  }
  if (!gate.ok) return gate.response;

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل لازم است" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type)) {
        return NextResponse.json(
          { error: "فقط تصویر JPEG/PNG/WebP/GIF یا PDF" },
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

    if (!ALLOWED_MIME.has(parsed.data.mimeType)) {
      return NextResponse.json(
        { error: "فقط تصویر JPEG/PNG/WebP/GIF یا PDF" },
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

const patchSchema = z.object({
  id: z.string().min(1),
  originalName: z.string().min(1).optional(),
  altText: z.string().nullable().optional(),
});

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "media.manage");
  if (!gate.ok) return gate.response;

  const contentType = request.headers.get("content-type") ?? "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const id = String(form.get("id") ?? "").trim();
      if (!id) {
        return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
      }
      const existing = await getMediaById(id);
      if (!existing) {
        return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
      }

      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "فایل لازم است" }, { status: 400 });
      }
      if (!ALLOWED_MIME.has(file.type) || file.type === "application/pdf") {
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

      const localPath = localPublicPathFromUrl(existing.url);
      const buffer = Buffer.from(await file.arrayBuffer());
      let nextUrl = existing.url;

      if (localPath) {
        await mkdir(path.dirname(localPath), { recursive: true });
        await writeFile(localPath, buffer);
      } else {
        const folderRaw =
          String(form.get("folder") ?? existing.folder ?? "library").trim() ||
          "library";
        const folder = folderRaw.replace(/[^\w\-آ-ی]+/gi, "_").slice(0, 64);
        const filename = `${randomUUID()}${extForMime(file.type)}`;
        const dir = path.join(process.cwd(), "public", "uploads", "admin", folder);
        await mkdir(dir, { recursive: true });
        await writeFile(path.join(dir, filename), buffer);
        nextUrl = `/uploads/admin/${folder}/${filename}`;
      }

      const item = await updateMedia(id, {
        originalName: file.name || existing.originalName,
        mimeType: file.type,
        sizeBytes: file.size,
        url: nextUrl,
      });
      if (!item) {
        return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
      }

      await logAdminAction({
        action: "media.replace",
        entityType: "media",
        entityId: id,
        adminUserId: gate.ctx.user?.id,
      });

      return NextResponse.json({ item });
    }

    const parsed = patchSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
    }

    const item = await updateMedia(parsed.data.id, {
      originalName: parsed.data.originalName,
      altText: parsed.data.altText,
    });
    if (!item) {
      return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
    }

    await logAdminAction({
      action: "media.update",
      entityType: "media",
      entityId: parsed.data.id,
      adminUserId: gate.ctx.user?.id,
    });

    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "خطا در ویرایش رسانه",
      },
      { status: 503 },
    );
  }
}
