"use client";

import type { IconProps as PhosphorIconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";

interface IconProps extends PhosphorIconProps {
  icon: ComponentType<PhosphorIconProps>;
}

export function Icon({
  icon: IconComponent,
  weight = "light",
  ...props
}: IconProps) {
  return <IconComponent weight={weight} {...props} />;
}
