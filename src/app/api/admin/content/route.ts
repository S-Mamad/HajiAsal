import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import {
  getSiteSettings,
  updateSiteSettings,
} from "@/lib/server/site-settings";

/** Content-manage may only touch marketing/CMS fields — not shipping/settings. */
const contentPatchSchema = z
  .object({
    hero: z
      .object({
        title: z.string().optional(),
        subtitle: z.string().optional(),
        cta: z.string().optional(),
        ctaHref: z.string().optional(),
        image: z.string().optional(),
      })
      .optional(),
    brand: z
      .object({
        name: z.string().optional(),
        tagline: z.string().optional(),
        description: z.string().optional(),
      })
      .optional(),
    brandStory: z
      .object({
        title: z.string().optional(),
        paragraphs: z.array(z.string()).optional(),
      })
      .optional(),
    aboutPage: z
      .object({
        paragraphs: z.array(z.string()).optional(),
      })
      .optional(),
    footer: z
      .object({
        phone: z.string().optional(),
        email: z.string().optional(),
        address: z.string().optional(),
      })
      .optional(),
    social: z.record(z.string(), z.string().optional()).optional(),
  })
  .strict();

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "content.view");
  if (!__gate.ok) return __gate.response;

  const settings = await getSiteSettings();
  return NextResponse.json({ settings });
}

export async function PATCH(request: Request) {
  const __gate = await gateAdmin(request, "content.manage");
  if (!__gate.ok) return __gate.response;

  try {
    const body = await request.json();
    const parsed = contentPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "فیلدهای محتوا نامعتبر است" },
        { status: 400 },
      );
    }
    const settings = await updateSiteSettings(
      parsed.data as Partial<import("@/types").SiteConfig>,
    );
    return NextResponse.json({ success: true, settings });
  } catch {
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
