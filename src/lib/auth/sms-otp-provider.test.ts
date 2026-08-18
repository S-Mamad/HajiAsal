import { afterEach, describe, expect, it, vi } from "vitest";

describe("SmsOtpProvider channel priority", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("prefers console OTP gateway over derived simple URL", async () => {
    vi.stubEnv("SMS_PROVIDER", "melipayamak");
    vi.stubEnv(
      "MELIPAYAMAK_OTP_URL",
      "https://console.melipayamak.com/api/send/otp/tok",
    );
    delete process.env.MELIPAYAMAK_BODY_ID;
    delete process.env.MELIPAYAMAK_PREFER_SIMPLE;

    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("/otp/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ code: "4821", status: "ارسال موفق بود" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ status: "ارسال موفق بود" }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SmsOtpProvider } = await import("./sms-otp-provider");
    const provider = new SmsOtpProvider();
    expect(provider.generatesOwnCode).toBe(true);

    const result = await provider.send("09123456789", "9999");
    expect(result.success).toBe(true);
    expect(result.code).toBe("4821");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/otp/");
  });

  it("uses shared bodyId with our code when configured", async () => {
    vi.stubEnv("SMS_PROVIDER", "melipayamak");
    vi.stubEnv("MELIPAYAMAK_OTP_TOKEN", "tok");
    vi.stubEnv("MELIPAYAMAK_BODY_ID", "12345");

    const fetchMock = vi.fn(
      async (_url: string | URL, _init?: RequestInit) => ({
        ok: true,
        status: 200,
        json: async () => ({ status: "ارسال موفق بود" }),
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { SmsOtpProvider } = await import("./sms-otp-provider");
    const provider = new SmsOtpProvider();
    expect(provider.generatesOwnCode).toBe(false);

    const result = await provider.send("09123456789", "5577");
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/shared/");
    const body = JSON.parse(
      String((fetchMock.mock.calls[0]![1] as RequestInit).body),
    );
    expect(body).toMatchObject({
      bodyId: 12345,
      args: ["5577"],
    });
  });

  it("uses Kavenegar verify/lookup when template is set", async () => {
    vi.stubEnv("SMS_PROVIDER", "kavenegar");
    vi.stubEnv("SMS_API_KEY", "kv-key");
    vi.stubEnv("KAVENEGAR_OTP_TEMPLATE", "hajiasal-otp");
    vi.stubEnv("SMS_SENDER", "1000");

    const fetchMock = vi.fn(async (url: string | URL) => {
      expect(String(url)).toContain("verify/lookup.json");
      return {
        ok: true,
        status: 200,
        json: async () => ({ return: { status: 200 } }),
      };
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SmsOtpProvider } = await import("./sms-otp-provider");
    const provider = new SmsOtpProvider();
    const result = await provider.send("09123456789", "3344");
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses console shared before REST BaseService when both exist", async () => {
    vi.stubEnv("SMS_PROVIDER", "melipayamak");
    vi.stubEnv("MELIPAYAMAK_OTP_TOKEN", "tok");
    vi.stubEnv("MELIPAYAMAK_BODY_ID", "12345");
    vi.stubEnv("MELIPAYAMAK_USERNAME", "user");
    vi.stubEnv("MELIPAYAMAK_PASSWORD", "pass");

    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("/shared/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "ارسال موفق بود" }),
        };
      }
      throw new Error(`unexpected url ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SmsOtpProvider } = await import("./sms-otp-provider");
    const result = await new SmsOtpProvider().send("09123456789", "7788");
    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/shared/");
  });

  it("does not fall through to gateway or simple when pattern is configured", async () => {
    vi.stubEnv("SMS_PROVIDER", "melipayamak");
    vi.stubEnv("MELIPAYAMAK_OTP_TOKEN", "tok");
    vi.stubEnv("MELIPAYAMAK_BODY_ID", "12345");
    vi.stubEnv(
      "MELIPAYAMAK_OTP_URL",
      "https://console.melipayamak.com/api/send/otp/tok",
    );

    const fetchMock = vi.fn(async (url: string | URL) => {
      const href = String(url);
      if (href.includes("/shared/")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ status: "اعتبار کافی نیست" }),
        };
      }
      throw new Error(`unexpected fallback ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const { SmsOtpProvider } = await import("./sms-otp-provider");
    const result = await new SmsOtpProvider().send("09123456789", "7788");
    expect(result.success).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
