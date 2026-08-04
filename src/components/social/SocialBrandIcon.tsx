import { cn } from "@/lib/utils";

export type SocialBrand =
  | "eitaa"
  | "telegram"
  | "instagram"
  | "rubika"
  | "bale"
  | "soroush";

const BRAND_SRC: Record<SocialBrand, string> = {
  eitaa: "/images/hajiasal/social/eitaa.svg",
  telegram: "/images/hajiasal/social/telegram.svg",
  instagram: "/images/hajiasal/social/instagram.png",
  rubika: "/images/hajiasal/social/rubika.png",
  bale: "/images/hajiasal/social/bale.svg",
  soroush: "/images/hajiasal/social/soroush.png",
};

interface SocialBrandIconProps {
  brand: SocialBrand;
  size?: number;
  className?: string;
  alt?: string;
}

/** Official brand mark for each social / messenger network. */
export function SocialBrandIcon({
  brand,
  size = 36,
  className,
  alt = "",
}: SocialBrandIconProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_SRC[brand]}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      decoding="async"
      className={cn("block object-cover object-center", className)}
      style={{ width: size, height: size }}
    />
  );
}
