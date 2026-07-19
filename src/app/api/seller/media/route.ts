import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { RowDataPacket } from "mysql2/promise";
import { gateSeller, clientIpFromRequest } from "@/lib/server/seller-gate";
import { logSellerActivity } from "@/lib/server/seller-activity";
import {
  isMysqlConfigured,
  mysqlExecute,
  mysqlQuery,
  toIso,
} from "@/lib/server/mysql";

const memoryMedia: Array<{
  id: string;
  sellerId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}> = [];

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

function extForMime(mime: string): string {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

export async function GET(request: Request) {
  const gated = await gateSeller(request, "media.manage");
  if (!gated.ok) return gated.response;

  if (isMysqlConfigured()) {
    try {
      const rows = await mysqlQuery<RowDataPacket>(
        `SELECT * FROM seller_media WHERE seller_id = ? ORDER BY created_at DESC`,
        [gated.ctx.seller.id],
      );
      return NextResponse.json({
        files: rows.map((r) => ({
          id: String(r.id),
          name: String(r.name),
          mimeType: String(r.mime_type),
          sizeBytes: Number(r.size_bytes),
          url: String(r.url),
          createdAt: toIso(r.created_at),
        })),
      });
    } catch {
      /* fallthrough */
    }
  }

  return NextResponse.json({
    files: memoryMedia
      .filter((f) => f.sellerId === gated.ctx.seller.id)
      .map(({ sellerId: _s, ...f }) => f),
  });
}

const createSchema = z.object({
  name: z.string().min(1).max(255),
  mimeType: z.string().min(1).max(120),
  sizeBytes: z.number().int().min(0).max(10_000_000),
  url: z.string().min(1).max(2000),
});

async function persistMediaMeta(input: {
  id: string;
  sellerId: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  createdAt: string;
}) {
  if (isMysqlConfigured()) {
    await mysqlExecute(
      `INSERT INTO seller_media
        (id, seller_id, name, mime_type, size_bytes, url, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.id,
        input.sellerId,
        input.name,
        input.mimeType,
        input.sizeBytes,
        input.url,
        input.createdAt,
      ],
    );
  } else {
    memoryMedia.unshift({
      id: input.id,
      sellerId: input.sellerId,
      name: input.name,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      url: input.url,
      createdAt: input.createdAt,
    });
  }
}

export async function POST(request: Request) {
  const gated = await gateSeller(request, "media.manage");
  if (!gated.ok) return gated.response;

  const contentType = request.headers.get("content-type") ?? "";
  const sellerId = gated.ctx.seller.id;
  const id = randomUUID();
  const now = new Date().toISOString();

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
      if (file.size > 5_000_000) {
        return NextResponse.json(
          { error: "حداکثر حجم ۵ مگابایت" },
          { status: 400 },
        );
      }

      const safeName = (file.name || "upload").replace(/[^\w.\-آ-ی ]+/gi, "_");
      const filename = `${id}${extForMime(file.type)}`;
      const dir = path.join(process.cwd(), "public", "uploads", "seller", sellerId);
      await mkdir(dir, { recursive: true });
      const buffer = Buffer.from(await file.arrayBuffer());
      await writeFile(path.join(dir, filename), buffer);
      const url = `/uploads/seller/${sellerId}/${filename}`;

      await persistMediaMeta({
        id,
        sellerId,
        name: safeName,
        mimeType: file.type,
        sizeBytes: file.size,
        url,
        createdAt: now,
      });

      await logSellerActivity({
        sellerId,
        action: "media.upload",
        entityType: "media",
        entityId: id,
        ip: clientIpFromRequest(request),
      });

      return NextResponse.json({
        success: true,
        file: {
          id,
          name: safeName,
          mimeType: file.type,
          sizeBytes: file.size,
          url,
          createdAt: now,
        },
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "فایل نامعتبر" }, { status: 400 });
    }

    await persistMediaMeta({
      id,
      sellerId,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      url: parsed.data.url,
      createdAt: now,
    });

    await logSellerActivity({
      sellerId,
      action: "media.upload",
      entityType: "media",
      entityId: id,
      ip: clientIpFromRequest(request),
    });

    return NextResponse.json({
      success: true,
      file: { id, ...parsed.data, createdAt: now },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "خطا" },
      { status: 500 },
    );
  }
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const gated = await gateSeller(request, "media.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  let url: string | undefined;

  if (isMysqlConfigured()) {
    try {
      const row = await mysqlQuery<RowDataPacket>(
        `SELECT url FROM seller_media WHERE id = ? AND seller_id = ? LIMIT 1`,
        [parsed.data.id, gated.ctx.seller.id],
      );
      url = row[0] ? String(row[0].url) : undefined;
      const result = await mysqlExecute(
        `DELETE FROM seller_media WHERE id = ? AND seller_id = ?`,
        [parsed.data.id, gated.ctx.seller.id],
      );
      if (result.affectedRows === 0) {
        return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
      }
    } catch {
      return NextResponse.json({ error: "حذف ناموفق" }, { status: 500 });
    }
  } else {
    const idx = memoryMedia.findIndex(
      (f) => f.id === parsed.data.id && f.sellerId === gated.ctx.seller.id,
    );
    if (idx < 0) {
      return NextResponse.json({ error: "فایل یافت نشد" }, { status: 404 });
    }
    url = memoryMedia[idx].url;
    memoryMedia.splice(idx, 1);
  }

  if (url?.startsWith("/uploads/seller/")) {
    try {
      await unlink(path.join(process.cwd(), "public", url.replace(/^\//, "")));
    } catch {
      /* ignore missing file */
    }
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "media.delete",
    entityType: "media",
    entityId: parsed.data.id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({ success: true });
}
