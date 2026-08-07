import { handlePanelOtpSend } from "@/lib/auth/panel-otp";
import { isValidIranPhone } from "@/lib/auth/phone";

/** Any valid Iranian mobile may request an apply OTP (real SMS). */
export async function POST(request: Request) {
  return handlePanelOtpSend(request, "seller_apply", async (phone) =>
    isValidIranPhone(phone),
  );
}
