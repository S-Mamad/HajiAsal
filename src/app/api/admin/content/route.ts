import { z } from "zod";
import { gateAdmin } from "@/lib/server/admin-gate";
import { NextResponse } from "next/server";
import {
  getSiteSettings,
  resolveFaq,
  updateSiteSettings,
} from "@/lib/server/site-settings";
import {
  CopySanitizeError,
  sanitizeSiteContentPatch,
} from "@/lib/server/sanitize-site-content";
import { revalidatePath } from "next/cache";
import { logAdminAction } from "@/lib/server/audit-log";

const text = z.string().max(8000);

const trustPageSchema = z.object({
  title: text.optional(),
  intro: text.optional(),
  sections: z
    .array(z.object({ heading: text.optional(), body: text.optional() }))
    .max(12)
    .optional(),
});

/** Content-manage may only touch marketing/CMS fields — not shipping/settings. */
const contentPatchSchema = z
  .object({
    hero: z
      .object({
        title: text.optional(),
        subtitle: text.optional(),
        cta: text.optional(),
        ctaHref: text.optional(),
        image: text.optional(),
        imageMobile: text.optional(),
      })
      .optional(),
    brand: z
      .object({
        name: text.optional(),
        tagline: text.optional(),
        description: text.optional(),
      })
      .optional(),
    brandStory: z
      .object({
        title: text.optional(),
        paragraphs: z.array(text).max(8).optional(),
      })
      .optional(),
    aboutPage: z
      .object({
        paragraphs: z.array(text).max(12).optional(),
      })
      .optional(),
    footer: z
      .object({
        phone: text.optional(),
        email: text.optional(),
        address: text.optional(),
      })
      .optional(),
    social: z.record(z.string(), z.string().optional()).optional(),
    nav: z
      .array(
        z.object({
          id: text,
          label: text,
          href: text,
        }),
      )
      .max(12)
      .optional(),
    faq: z
      .array(
        z.object({
          id: text.optional(),
          question: text,
          answer: text,
        }),
      )
      .max(24)
      .optional(),
    trustItems: z
      .array(
        z.object({
          id: text,
          title: text,
          description: text,
        }),
      )
      .max(6)
      .optional(),
    milestones: z
      .array(
        z.object({
          year: text,
          title: text,
          description: text,
        }),
      )
      .max(12)
      .optional(),
    trustPages: z
      .object({
        authenticity: trustPageSchema.optional(),
        privacy: trustPageSchema.optional(),
        terms: trustPageSchema.optional(),
        shipping: trustPageSchema.optional(),
      })
      .optional(),
  })
  .strict();

function withFaq(settings: Awaited<ReturnType<typeof getSiteSettings>>) {
  return { ...settings, faq: resolveFaq(settings) };
}

export async function GET(request: Request) {
  const __gate = await gateAdmin(request, "content.view");
  if (!__gate.ok) return __gate.response;

  const settings = await getSiteSettings();
  return NextResponse.json({ settings: withFaq(settings) });
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
    const sanitized = sanitizeSiteContentPatch(
      parsed.data as Record<string, unknown>,
    );
    const settings = await updateSiteSettings(sanitized);
    try {
      revalidatePath("/", "layout");
      revalidatePath("/faq");
      revalidatePath("/about");
      revalidatePath("/shipping");
      revalidatePath("/privacy");
      revalidatePath("/terms");
      revalidatePath("/authenticity");
    } catch {
      /* tests / non-request runtime */
    }
    await logAdminAction({
      action: "content.update",
      entityType: "site_settings",
      entityId: "hajiasal",
      adminUserId: __gate.ctx.user?.id,
      payload: { keys: Object.keys(sanitized) },
    });
    return NextResponse.json({ success: true, settings: withFaq(settings) });
  } catch (err) {
    if (err instanceof CopySanitizeError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "خطای سرور" }, { status: 500 });
  }
}
