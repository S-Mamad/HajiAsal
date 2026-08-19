"use client";

import Image from "next/image";
import { ArrowLeft } from "@phosphor-icons/react";
import type { ResolvedSellerBannerSection } from "@/lib/home-sections";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/ui/Reveal";
import { hajiasalPath } from "@/lib/paths";

type SellerJoinBannerProps = {
  config: ResolvedSellerBannerSection;
};

export function SellerJoinBanner({ config }: SellerJoinBannerProps) {
  if (!config.enabled) return null;

  return (
    <section className="py-12 md:py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <div className="grid items-center gap-0 overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-[0_18px_40px_-32px_rgb(28_25_23/0.2)] md:grid-cols-[1fr_minmax(0,0.9fr)]">
            <div className="relative aspect-[16/10] min-h-[200px] md:aspect-auto md:min-h-[280px]">
              <Image
                src={config.image}
                alt={config.title}
                fill
                sizes="(max-width: 768px) 100vw, 45vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-surface-elevated via-transparent to-transparent md:bg-gradient-to-l md:from-surface-elevated md:via-surface-elevated/30 md:to-transparent" />
            </div>
            <div className="flex flex-col justify-center px-6 pb-8 pt-5 md:px-8 md:py-10">
              <h2 className="mb-3 font-display text-xl font-semibold tracking-tight text-primary md:text-2xl">
                {config.title}
              </h2>
              <p className="mb-6 max-w-lg text-sm leading-relaxed text-secondary md:text-base">
                {config.description}
              </p>
              <Button
                href={hajiasalPath(config.ctaHref)}
                size="lg"
                className="w-full sm:w-auto"
              >
                {config.ctaText}
                <ArrowLeft size={18} weight="bold" className="shrink-0" />
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
