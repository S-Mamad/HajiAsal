import { NextResponse } from "next/server";
import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { listQuestions, updateQuestion } from "@/lib/server/admin-platform-store";
import { logAdminAction } from "@/lib/server/audit-log";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "qa.view");
  if (!gate.ok) return gate.response;
  return NextResponse.json({ items: await listQuestions() });
}

const schema = z.object({
  id: z.string(),
  answer: z.string().optional(),
  status: z.string().optional(),
});

export async function PATCH(request: Request) {
  const gate = await gateAdmin(request, "qa.manage");
  if (!gate.ok) return gate.response;
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "اطلاعات نامعتبر است" }, { status: 400 });
  }
  const item = await updateQuestion(parsed.data.id, {
    answer: parsed.data.answer,
    status: parsed.data.status,
    answeredBy: gate.ctx.user?.id,
  });
  if (!item) return NextResponse.json({ error: "یافت نشد" }, { status: 404 });
  await logAdminAction({
    action: "qa.update",
    entityType: "product_question",
    entityId: item.id,
    adminUserId: gate.ctx.user?.id,
  });
  return NextResponse.json({ item });
}
