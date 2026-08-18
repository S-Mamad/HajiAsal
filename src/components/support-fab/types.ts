import type { SupportPageKind } from "@/lib/support-fab/context";

export type SupportHandshake = {
  authenticated: boolean;
  /** Logged-in user OR guest name+phone collected */
  identified: boolean;
  kind: "user" | "guest" | null;
  withinHours: boolean;
  operatorOnline: boolean;
  unreadCount: number;
  openTicketId: string | null;
  pendingPaymentCount: number;
  shippingOrderId: string | null;
  accountValue: number;
  vip: boolean;
  vipSummary: string | null;
  user: { fullName: string | null; phone: string } | null;
  currentUrl: string | null;
  pageKind: SupportPageKind;
};

export type SupportFabPanelProps = {
  open: boolean;
  onClose: () => void;
  pageKind: SupportPageKind;
  productOutOfStock: boolean;
  handshake: SupportHandshake | null;
  onHandshake: (next: SupportHandshake) => void;
  onUnread: (count: number) => void;
};
