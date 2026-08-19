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
        نام کامل را بعداً هم می‌توانید تکمیل کنید.
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
