import { describe, expect, it } from "vitest";
import site from "@/data/site.json";
import { mergeSiteConfig } from "@/lib/server/site-settings";
import type { SiteConfig } from "@/types";

const seed = site as SiteConfig;

describe("mergeSiteConfig", () => {
  it("keeps all messengers when override only patches Instagram", () => {
    const merged = mergeSiteConfig(seed, {
      social: {
        instagram: "https://instagram.com/wrong_handle",
      },
    });

    const social = merged.social!;
    expect(social.instagram).toBe("https://instagram.com/hajiasal_ir");
    expect(social.telegram).toBe("https://t.me/hajiasal_ir");
    expect(social.eitaa).toBe("https://eitaa.com/hajiasal_ir");
    expect(social.rubika).toBeTruthy();
    expect(social.bale).toBeTruthy();
    expect(social.soroush).toBeTruthy();
  });

  it("forces canonical phone even if override has another number", () => {
    const merged = mergeSiteConfig(seed, {
      footer: { phone: "09121234567", email: "x@y.z", address: "a" },
    });
    expect(merged.footer.phone).toBe("09967891973");
    expect(merged.footer.email).toBe("x@y.z");
  });

  it("deep-merges hero without wiping sibling fields", () => {
    const merged = mergeSiteConfig(seed, {
      hero: { title: "عنوان جدید" },
    });
    expect(merged.hero.title).toBe("عنوان جدید");
    expect(merged.hero.subtitle).toBe(seed.hero.subtitle);
    expect(merged.hero.cta).toBe(seed.hero.cta);
  });
});
