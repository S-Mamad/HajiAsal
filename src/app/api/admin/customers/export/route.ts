import { NextResponse } from "next/server";
import { gateAdmin } from "@/lib/server/admin-gate";
import { getAllProfilesWithStats } from "@/lib/server/profiles";

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET(request: Request) {
  const gate = await gateAdmin(request, "reports.export");
  if (!gate.ok) return gate.response;

  const customers = await getAllProfilesWithStats();
  const header = [
    "id",
    "full_name",
    "phone",
    "email",
    "order_count",
    "total_spent",
    "created_at",
  ].join(",");

  const rows = customers.map((c) =>
    [
      c.id,
      c.fullName ?? "",
      c.phone,
      c.email ?? "",
      String(c.orderCount),
      String(c.totalSpent),
      c.createdAt,
    ]
      .map(escapeCsv)
      .join(","),
  );

  const csv = "\uFEFF" + [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="hajiasal-customers-${Date.now()}.csv"`,
    },
  });
}
