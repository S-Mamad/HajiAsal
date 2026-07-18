import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { getAllProfilesWithStats } from "@/lib/server/profiles";

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "customers.view");
  if (!gate.ok) return gate.response;

  const customers = await getAllProfilesWithStats();
  return NextResponse.json({ customers });
}
