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
    expect(social.instagram).toBe("https://instagram.com/wrong_handle");
    expect(social.telegram).toBe("https://t.me/hajiasal_ir");
    expect(social.eitaa).toBe("https://eitaa.com/hajiasal_ir");
    expect(social.rubika).toBeTruthy();
    expect(social.bale).toBeTruthy();
    expect(social.soroush).toBeTruthy();
  });

  it("persists admin phone, email, and address overrides", () => {
    const merged = mergeSiteConfig(seed, {
      footer: { phone: "09121234567", email: "x@y.z", address: "یزد، انبار جدید" },
    });
    expect(merged.footer.phone).toBe("09121234567");
    expect(merged.footer.email).toBe("x@y.z");
    expect(merged.footer.address).toBe("یزد، انبار جدید");
  });

  it("deep-merges cartPromo without wiping sibling merchandising fields", () => {
    const merged = mergeSiteConfig(seed, {
      cartPromo: { impulseEnabled: false, impulseTitle: "پیشنهاد ویژه" },
    });
    expect(merged.cartPromo?.impulseEnabled).toBe(false);
    expect(merged.cartPromo?.impulseTitle).toBe("پیشنهاد ویژه");
    expect(merged.cartPromo?.freeShippingBarEnabled).toBe(true);
    expect(merged.cartPromo?.impulseMode).toBe("popular");
  });

  it("replaces search suggestions without dropping placeholder", () => {
    const merged = mergeSiteConfig(seed, {
      searchUi: { suggestions: ["عسل گون", "شهد"] },
    });
    expect(merged.searchUi?.suggestions).toEqual(["عسل گون", "شهد"]);
    expect(merged.searchUi?.placeholder).toBe("عسل، ژل رویال، هدیه…");
  });
});
