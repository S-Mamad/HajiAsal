"use client";

import { BottomSheet } from "@/components/ui/BottomSheet";
import { PhoneLoginForm } from "@/components/auth/PhoneLoginForm";

interface CheckoutAuthSheetProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
}

export function CheckoutAuthSheet({
  open,
  onClose,
  onAuthenticated,
}: CheckoutAuthSheetProps) {
  return (
    <BottomSheet open={open} onClose={onClose} title="ورود با شماره موبایل">
      <p className="mb-4 text-sm text-secondary">
        فقط شماره موبایل کافی است. کد یک‌بارمصرف پیامکی را وارد کنید تا ادامه
        دهید.
      </p>
      <PhoneLoginForm
        allowIncompleteProfile
        onAuthenticated={() => {
          onAuthenticated();
          onClose();
        }}
        onWelcome={() => {
          onAuthenticated();
          onClose();
        }}
        onNeedsRegister={() => {
          onAuthenticated();
          onClose();
        }}
      />
    </BottomSheet>
  );
}
