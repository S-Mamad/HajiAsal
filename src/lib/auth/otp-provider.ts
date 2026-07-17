export interface OtpSendResult {
  success: boolean;
  message: string;
  /**
   * When the SMS gateway generates the OTP itself (e.g. Melipayamak console OTP),
   * the plaintext code is returned so we can hash+store it for verify.
   * Never exposed to the client.
   */
  code?: string;
}

export interface OtpVerifyResult {
  valid: boolean;
  message: string;
}

export interface OtpProvider {
  readonly name: string;
  /**
   * If true, `send` ignores the `code` argument and returns `result.code`
   * from the gateway (Melipayamak console OTP).
   */
  readonly generatesOwnCode?: boolean;
  send(phone: string, code: string): Promise<OtpSendResult>;
  canSendTo(phone: string): boolean;
}
