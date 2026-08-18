import { VIP_ACCOUNT_VALUE_TOMAN } from "./constants";
import { pageKindLabel, type SupportPageKind } from "./context";

export function isHighValueAccount(accountValue: number): boolean {
  return accountValue >= VIP_ACCOUNT_VALUE_TOMAN;
}

export function buildVipSummary(input: {
  fullName?: string | null;
  pageKind: SupportPageKind;
  pendingPaymentCount: number;
  accountValue: number;
}): string {
  const name = input.fullName?.trim() || "مشتری";
  const parts = [`${name}، هم‌اکنون در ${pageKindLabel(input.pageKind)} است`];
  if (input.pendingPaymentCount > 0) {
    parts.push(
      `${toFaDigits(input.pendingPaymentCount)} سفارش در انتظار پرداخت دارد`,
    );
  }
  if (isHighValueAccount(input.accountValue)) {
    parts.push("ارزش حسابش بالاست");
  }
  return `${parts.join("، ")}.`;
}

function toFaDigits(value: number): string {
  return value.toLocaleString("fa-IR");
}
