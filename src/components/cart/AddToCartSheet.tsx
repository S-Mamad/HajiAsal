"use client";

import { CheckCircle } from "@phosphor-icons/react";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Button } from "@/components/ui/Button";
import { hajiasalPath } from "@/lib/paths";

interface AddToCartSheetProps {
  open: boolean;
  onClose: () => void;
  productTitle?: string;
}

export function AddToCartSheet({
  open,
  onClose,
  productTitle,
}: AddToCartSheetProps) {
  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="به سبد اضافه شد"
      footer={
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" className="w-full" onClick={onClose}>
            ادامه خرید
          </Button>
          <Button href={hajiasalPath("/cart")} className="w-full" onClick={onClose}>
            مشاهده سبد
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center gap-3 py-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle size={32} weight="fill" />
        </div>
        {productTitle ? (
          <p className="text-sm text-secondary">
            <span className="font-medium text-primary">{productTitle}</span> به
            سبد خرید شما اضافه شد.
          </p>
        ) : (
          <p className="text-sm text-secondary">کالا به سبد خرید اضافه شد.</p>
        )}
      </div>
    </BottomSheet>
  );
}
