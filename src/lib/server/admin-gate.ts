import { NextResponse } from "next/server";
import {
  requireAdminPermission,
  type AdminAuthContext,
} from "@/lib/server/admin-auth";
import type { AdminPermission } from "@/lib/admin/permissions";

export async function gateAdmin(
  request: Request,
  permission: AdminPermission,
): Promise<
  | { ok: true; ctx: AdminAuthContext }
  | { ok: false; response: NextResponse }
> {
  const result = await requireAdminPermission(request, permission);
  if (!result.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: result.message, success: false },
        { status: result.status },
      ),
    };
  }
  return { ok: true, ctx: result.ctx };
}
