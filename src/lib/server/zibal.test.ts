import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getZibalMerchant,
  isZibalConfigured,
  isZibalRefundConfigured,
  isZibalSandboxMerchant,
  isZibalVerifySuccess,
  zibalRequestResultMessage,
  zibalStartPayUrl,
  zibalVerifyResultMessage,
  zibalRequestUrl,
  zibalVerifyUrl,
} from "./zibal";

describe("zibal helpers", () => {
  const env = { ...process.env };

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.ZIBAL_MERCHANT;
    delete process.env.ZIBAL_REFUND_ENABLED;
    delete process.env.ZIBAL_API_KEY;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("is not configured without merchant", () => {
    expect(getZibalMerchant()).toBeNull();
    expect(isZibalConfigured()).toBe(false);
  });

  it("reads merchant from env", () => {
    process.env.ZIBAL_MERCHANT = "  abc123  ";
    expect(getZibalMerchant()).toBe("abc123");
    expect(isZibalConfigured()).toBe(true);
    expect(isZibalSandboxMerchant()).toBe(false);
  });

  it("detects sandbox merchant string zibal", () => {
    process.env.ZIBAL_MERCHANT = "zibal";
    expect(isZibalSandboxMerchant()).toBe(true);
  });

  it("builds gateway URLs", () => {
    expect(zibalRequestUrl()).toBe("https://gateway.zibal.ir/v1/request");
    expect(zibalVerifyUrl()).toBe("https://gateway.zibal.ir/v1/verify");
    expect(zibalStartPayUrl(15966442233311)).toBe(
      "https://gateway.zibal.ir/start/15966442233311",
    );
  });

  it("maps result codes and verify success", () => {
    expect(isZibalVerifySuccess(100)).toBe(true);
    expect(isZibalVerifySuccess(201)).toBe(true);
    expect(isZibalVerifySuccess(202)).toBe(false);
    expect(zibalRequestResultMessage(102)).toMatch(/merchant/);
    expect(zibalVerifyResultMessage(201)).toMatch(/قبلاً/);
  });

  it("refund config requires flag + API key", () => {
    expect(isZibalRefundConfigured()).toBe(false);
    process.env.ZIBAL_REFUND_ENABLED = "true";
    expect(isZibalRefundConfigured()).toBe(false);
    process.env.ZIBAL_API_KEY = "key";
    expect(isZibalRefundConfigured()).toBe(true);
  });
});
