"use client";

import { ShieldCheck, Truck, Headset } from "@phosphor-icons/react";
import site from "@/data/site.json";
import type { SiteConfig } from "@/types";
import { Reveal } from "@/components/ui/Reveal";

const siteData = site as SiteConfig;

const icons = {
  authentic: ShieldCheck,
  shipping: Truck,
  support: Headset,
};

export function TrustBar() {
  return (
    <section className="border-y border-border py-7 md:py-12">
      <div className="mx-auto max-w-5xl px-3 sm:px-4 md:px-8">
        <Reveal>
          <ul className="grid grid-cols-3 divide-x divide-border">
            {siteData.trustItems.map((item) => {
              const Icon = icons[item.id as keyof typeof icons] ?? ShieldCheck;
              return (
                <li
                  key={item.id}
                  className="flex flex-col items-center px-2 text-center sm:px-4 md:px-6"
                >
                  <Icon
                    size={18}
                    weight="thin"
                    className="mb-2.5 text-gold/80 md:mb-3 md:h-5 md:w-5"
                  />
                  <h3 className="text-[11px] font-medium leading-snug text-primary sm:text-sm md:text-[15px]">
                    {item.title}
                  </h3>
                  <p className="mt-1 max-w-[9.5rem] text-[10px] leading-relaxed text-dim sm:mt-1.5 sm:max-w-none sm:text-xs md:text-[13px] md:text-secondary">
                    {item.description}
                  </p>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
