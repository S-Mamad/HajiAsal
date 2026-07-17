import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  getAddressesByUserId,
  createAddress,
  deleteAddress,
} from "@/lib/server/profiles";

const addressSchema = z.object({
  label: z.string().optional(),
  province: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(5),
  postalCode: z.string().min(10).max(10),
  isDefault: z.boolean().optional(),
});

export async function GET(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const addresses = await getAddressesByUserId(session.userId);
  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "آدرس نامعتبر است" },
      { status: 400 },
    );
  }

  const address = await createAddress(session.userId, {
    label: parsed.data.label ?? null,
    province: parsed.data.province,
    city: parsed.data.city,
    address: parsed.data.address,
    postalCode: parsed.data.postalCode,
    isDefault: parsed.data.isDefault ?? false,
  });

  return NextResponse.json({ success: true, address });
}

export async function DELETE(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const ok = await deleteAddress(session.userId, id);
  return NextResponse.json({ success: ok });
}
