import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionFromRequest } from "@/lib/auth/session";
import {
  getAddressesByUserId,
  createAddress,
  deleteAddress,
  setDefaultAddress,
} from "@/lib/server/profiles";

const addressSchema = z.object({
  label: z.string().optional().nullable(),
  province: z.string().min(1),
  city: z.string().min(1),
  address: z.string().min(5),
  postalCode: z.string().min(10).max(10),
  isDefault: z.boolean().optional(),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  plaque: z.string().optional().nullable(),
  unit: z.string().optional().nullable(),
  receiverName: z.string().optional().nullable(),
  receiverPhone: z.string().optional().nullable(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  action: z.literal("setDefault"),
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

  const body = await request.json().catch(() => null);
  const parsed = addressSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: "آدرس نامعتبر است" },
      { status: 400 },
    );
  }

  try {
    const address = await createAddress(session.userId, {
      label: parsed.data.label ?? null,
      province: parsed.data.province,
      city: parsed.data.city,
      address: parsed.data.address,
      postalCode: parsed.data.postalCode,
      isDefault: parsed.data.isDefault ?? false,
      lat: parsed.data.lat ?? null,
      lng: parsed.data.lng ?? null,
      plaque: parsed.data.plaque ?? null,
      unit: parsed.data.unit ?? null,
      receiverName: parsed.data.receiverName ?? null,
      receiverPhone: parsed.data.receiverPhone ?? null,
    });

    return NextResponse.json({ success: true, address });
  } catch (error) {
    console.error("[addresses] create failed", error);
    return NextResponse.json(
      { success: false, message: "ذخیره آدرس ناموفق بود. دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "درخواست نامعتبر است" }, { status: 400 });
  }

  const address = await setDefaultAddress(session.userId, parsed.data.id);
  if (!address) {
    return NextResponse.json({ error: "آدرس پیدا نشد" }, { status: 404 });
  }

  const addresses = await getAddressesByUserId(session.userId);
  return NextResponse.json({ success: true, address, addresses });
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
