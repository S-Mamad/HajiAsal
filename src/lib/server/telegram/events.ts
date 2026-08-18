import type { StoredOrder } from "../orders";

export type TelegramNotifyEvent =
  | "order.paid"
  | "order.created"
  | "order.status_changed"
  | "order.cancelled"
  | "order.refunded"
  | "order.payment_failed"
  | "payment.create"
  | "payment.reuse"
  | "payment.spam_blocked"
  | "auth.login"
  | "auth.register"
  | "auth.otp_requested"
  | "coupon.applied"
  | "coupon.rejected"
  | "api.error_critical"
  | "deploy.update"
  | "contact.message"
  | "newsletter.subscribe"
  | "seller.application_new"
  | "seller.application_status"
  | "ticket.new"
  | "ticket.reply"
  | "review.created"
  | "inventory.out_of_stock"
  | "digest"
  | "command_reply";

export type TelegramNotifyResult = {
  sent: boolean;
  skipped?: string;
  error?: string;
};

export type OrderPaidPayload = {
  order: StoredOrder;
};

export type OrderCreatedPayload = {
  order: StoredOrder;
};

export type OrderStatusPayload = {
  order: StoredOrder;
  prevStatus?: string;
  nextStatus?: string;
};

export type OrderPaymentFailedPayload = {
  orderId: string;
  gateway?: string;
  reason?: "failed" | "cancelled" | "amount_mismatch";
};

export type PaymentGatewayPayload = {
  orderId: string;
  gateway: string;
  amountToman?: number;
  paymentRef?: string;
  reason?: string;
};

export type AuthNotifyPayload = {
  userId?: string;
  phone?: string;
  fullName?: string;
  isNewUser?: boolean;
};

export type ReviewCreatedPayload = {
  reviewId?: string;
  productId: string;
  author: string;
  rating: number;
  comment: string;
  phone?: string;
};

export type TicketReplyPayload = {
  id: string;
  subject?: string;
  excerpt: string;
  customerName?: string;
  customerPhone?: string;
};

export type CouponNotifyPayload = {
  code: string;
  valid: boolean;
  discount?: number;
  message?: string;
  phone?: string;
  orderId?: string;
  subtotal?: number;
  source?: "typed" | "checkout";
};

export type ApiErrorCriticalPayload = {
  route: string;
  message: string;
  orderId?: string;
  ip?: string;
};

export type DeployUpdatePayload = {
  title?: string;
  summaryLines: string[];
  app?: string;
  version?: string;
  source?: string;
};

export type ContactMessagePayload = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  subject: string;
  message: string;
};

export type NewsletterSubscribePayload = {
  email: string;
};

export type SellerApplicationPayload = {
  id: string;
  fullName: string;
  phone: string;
  productsIntro?: string;
  status?: string;
};

export type TicketNewPayload = {
  id: string;
  subject: string;
  customerName?: string;
  customerPhone?: string;
  excerpt?: string;
};

export type InventoryOutPayload = {
  orderId: string;
  productNames: string[];
};

export type DigestPayload = {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  salesYesterday?: number;
  ordersToday?: number;
  ordersWeek?: number;
  ordersMonth?: number;
  ordersYesterday?: number;
  pendingOrders: number;
  pendingOrdersFresh?: number;
  pendingOrdersStale?: number;
  openTickets: number;
  unreadMessages: number;
  lowStockCount: number;
  customersCount: number;
  avgOrderValue: number;
  avgOrderValueToday?: number;
  avgOrderValueWeek?: number;
  salesZibalToday?: number;
  salesSnappayToday?: number;
  reportStamp?: string;
};

export type CommandReplyPayload = {
  text: string;
};

export type TelegramPayloadMap = {
  "order.paid": OrderPaidPayload;
  "order.created": OrderCreatedPayload;
  "order.status_changed": OrderStatusPayload;
  "order.cancelled": OrderStatusPayload;
  "order.refunded": OrderStatusPayload;
  "order.payment_failed": OrderPaymentFailedPayload;
  "payment.create": PaymentGatewayPayload;
  "payment.reuse": PaymentGatewayPayload;
  "payment.spam_blocked": PaymentGatewayPayload;
  "auth.login": AuthNotifyPayload;
  "auth.register": AuthNotifyPayload;
  "auth.otp_requested": AuthNotifyPayload;
  "coupon.applied": CouponNotifyPayload;
  "coupon.rejected": CouponNotifyPayload;
  "api.error_critical": ApiErrorCriticalPayload;
  "deploy.update": DeployUpdatePayload;
  "contact.message": ContactMessagePayload;
  "newsletter.subscribe": NewsletterSubscribePayload;
  "seller.application_new": SellerApplicationPayload;
  "seller.application_status": SellerApplicationPayload;
  "ticket.new": TicketNewPayload;
  "ticket.reply": TicketReplyPayload;
  "review.created": ReviewCreatedPayload;
  "inventory.out_of_stock": InventoryOutPayload;
  digest: DigestPayload;
  command_reply: CommandReplyPayload;
};

export type TelegramOutboxKind = "outbound" | "inbound" | "callback";

export type TelegramOutboxStatus =
  | "pending"
  | "processing"
  | "sent"
  | "failed"
  | "dlq";
