import { NextResponse } from "next/server";
import { z } from "zod";
import { gateSeller } from "@/lib/server/seller-gate";
import {
  createSavedFilter,
  deleteSavedFilter,
  listSavedFilters,
} from "@/lib/server/seller-saved-filters";

export async function GET(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const moduleKey = new URL(request.url).searchParams.get("module") ?? "";
  if (!moduleKey) {
    return NextResponse.json({ error: "module لازم است" }, { status: 400 });
  }

  const filters = await listSavedFilters(gated.ctx.seller.id, moduleKey);
  return NextResponse.json({ filters });
}

const createSchema = z.object({
  moduleKey: z.string().min(1).max(64),
  name: z.string().min(1).max(120),
  payload: z.record(z.string(), z.unknown()),
});

export async function POST(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "داده نامعتبر" }, { status: 400 });
  }

  const filter = await createSavedFilter({
    sellerId: gated.ctx.seller.id,
    moduleKey: parsed.data.moduleKey,
    name: parsed.data.name,
    payload: parsed.data.payload,
  });
  return NextResponse.json({ success: true, filter });
}

const deleteSchema = z.object({ id: z.string().min(1) });

export async function DELETE(request: Request) {
  const gated = await gateSeller(request);
  if (!gated.ok) return gated.response;

  const body = await request.json().catch(() => null);
  const parsed = deleteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "نامعتبر" }, { status: 400 });
  }

  const ok = await deleteSavedFilter(gated.ctx.seller.id, parsed.data.id);
  if (!ok) {
    return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
