import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
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

export async function POST(request: Request) {
  const gated = await gateSeller(request, "media.manage");
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "فایل نامعتبر" }, { status: 400 });
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  if (isMysqlConfigured()) {
    try {
      await mysqlExecute(
        `INSERT INTO seller_media
          (id, seller_id, name, mime_type, size_bytes, url, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          gated.ctx.seller.id,
          parsed.data.name,
          parsed.data.mimeType,
          parsed.data.sizeBytes,
          parsed.data.url,
          now,
        ],
      );
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "خطا" },
        { status: 500 },
      );
    }
  } else {
    memoryMedia.unshift({
      id,
      sellerId: gated.ctx.seller.id,
      name: parsed.data.name,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
      url: parsed.data.url,
      createdAt: now,
    });
  }

  await logSellerActivity({
    sellerId: gated.ctx.seller.id,
    action: "media.upload",
    entityType: "media",
    entityId: id,
    ip: clientIpFromRequest(request),
  });

  return NextResponse.json({
    success: true,
    file: { id, ...parsed.data, createdAt: now },
  });
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

  if (isMysqlConfigured()) {
    try {
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
    memoryMedia.splice(idx, 1);
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
