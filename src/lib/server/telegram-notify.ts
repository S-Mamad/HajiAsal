export type {
  TelegramNotifyEvent,
  TelegramNotifyResult,
  OrderPaidPayload,
  OrderCreatedPayload,
  OrderStatusPayload,
  OrderPaymentFailedPayload,
  PaymentGatewayPayload,
  AuthNotifyPayload,
  ReviewCreatedPayload,
  TicketReplyPayload,
  CouponNotifyPayload,
  ApiErrorCriticalPayload,
  DeployUpdatePayload,
  ContactMessagePayload,
  NewsletterSubscribePayload,
  SellerApplicationPayload,
  TicketNewPayload,
  InventoryOutPayload,
  DigestPayload,
  CommandReplyPayload,
  TelegramPayloadMap,
} from "./telegram/events";

export {
  escapeHtml,
  maskPhone,
  buildTelegramTemplate,
} from "./telegram/format";

export {
  getTelegramAdminChatIds,
  isTelegramBotConfigured,
  isTelegramNotifyEnabled,
  isTelegramChatAllowed,
  getTelegramApiBaseUrl,
} from "./telegram/config";

export {
  sendTelegramMessage,
  sendTelegramAdminTestPing,
  replyTelegramChat,
} from "./telegram/client";

export { notifyTelegram } from "./telegram/notify";

import { buildTelegramTemplate, escapeHtml, maskPhone } from "./telegram/format";
import {
  getTelegramAdminChatIds,
  isTelegramBotConfigured,
  isTelegramNotifyEnabled,
} from "./telegram/config";

/** @internal */
export const __telegramNotifyTestUtils = {
  buildTelegramTemplate,
  escapeHtml,
  maskPhone,
  isTelegramBotConfigured,
  isTelegramNotifyEnabled,
  getTelegramAdminChatIds,
};
