import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import {
  deleteArticle,
  listArticles,
  upsertArticle,
} from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

const schema = z.object({
  id: z.string().optional(),
  title: z.string().min(1),
  slug: z.string().min(1),
  excerpt: z.string().nullable().optional(),
  body: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  categoryId: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  seo: z.record(z.string(), z.unknown()).optional(),
  status: z.string().optional(),
  publishedAt: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "articles.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listArticles() });
}

export async function POST(request: Request) {
  const gate = await gateAdmin(request, "articles.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await upsertArticle({
    ...parsed.data,
    authorId: gate.ctx.user?.id,
  });
  await logAdminAction({
    action: parsed.data.id ? "article.update" : "article.create",
    entityType: "article",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}

export async function DELETE(request: Request) {
  const gate = await gateAdmin(request, "articles.manage");
  if (!gate.ok) return gate.response;
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "شناسه الزامی است" }, { status: 400 });
  const ok = await deleteArticle(id);
  if (!ok) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "article.delete",
    entityType: "article",
    entityId: id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ success: true });
}
