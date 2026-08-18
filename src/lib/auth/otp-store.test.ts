import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/server/mysql", () => ({
  isMysqlConfigured: vi.fn(() => true),
  isMysqlUsable: vi.fn(() => true),
  mysqlExecute: vi.fn(),
  mysqlQueryOne: vi.fn(),
  newId: vi.fn(() => "otp-id-1"),
  toIso: vi.fn((v: unknown) =>
    v instanceof Date ? v.toISOString() : String(v),
  ),
}));

import {
  __resetOtpMemoryForTests,
  createOtpChallenge,
  generateOtpCode,
  verifyOtpChallenge,
} from "./otp-store";
import { normalizeOtpDigits } from "./otp-digits";
import {
  isMysqlConfigured,
  isMysqlUsable,
  mysqlExecute,
  mysqlQueryOne,
} from "@/lib/server/mysql";

const mockedConfigured = vi.mocked(isMysqlConfigured);
const mockedUsable = vi.mocked(isMysqlUsable);
const mockedExecute = vi.mocked(mysqlExecute);
const mockedQueryOne = vi.mocked(mysqlQueryOne);

afterEach(() => {
  __resetOtpMemoryForTests();
  vi.clearAllMocks();
  mockedConfigured.mockReturnValue(true);
  mockedUsable.mockReturnValue(true);
});

describe("otp-store MySQL resilience", () => {
  it("falls back to memory when MySQL insert fails", async () => {
    mockedExecute.mockRejectedValue(new Error("MySQL temporarily unavailable"));

    const code = await createOtpChallenge("09123456789", "1234");
    expect(code).toBe("1234");

    const result = await verifyOtpChallenge("09123456789", "1234");
    expect(result.valid).toBe(true);
  });

  it("falls back to memory verify when MySQL select fails", async () => {
    mockedExecute.mockResolvedValue({} as never);
    mockedQueryOne.mockRejectedValue(new Error("MySQL temporarily unavailable"));

    // Seed memory via failed insert path first
    mockedExecute.mockRejectedValueOnce(new Error("down"));
    await createOtpChallenge("09121112233", "5678");

    const result = await verifyOtpChallenge("09121112233", "5678");
    expect(result.valid).toBe(true);
  });

  it("rejects wrong code from memory fallback", async () => {
    mockedExecute.mockRejectedValue(new Error("down"));
    await createOtpChallenge("09120000000", "1111");
    const result = await verifyOtpChallenge("09120000000", "9999");
    expect(result.valid).toBe(false);
  });

  it("skips MySQL when circuit is open (usable=false)", async () => {
    mockedUsable.mockReturnValue(false);
    const code = await createOtpChallenge("09123334455", "4321");
    expect(code).toBe("4321");
    expect(mockedExecute).not.toHaveBeenCalled();
    const result = await verifyOtpChallenge("09123334455", "4321");
    expect(result.valid).toBe(true);
  });

  it("normalizes Persian digits", () => {
    expect(normalizeOtpDigits("۱۲۳۴")).toBe("1234");
    expect(normalizeOtpDigits("٠١٢٣")).toBe("0123");
  });

  it("generateOtpCode is 4 digits without leading zero", () => {
    for (let i = 0; i < 20; i += 1) {
      const code = generateOtpCode();
      expect(code).toMatch(/^[1-9]\d{3}$/);
    }
  });

  it("locks after 5 wrong memory attempts", async () => {
    mockedUsable.mockReturnValue(false);
    await createOtpChallenge("09120001111", "2222");
    for (let i = 0; i < 5; i += 1) {
      const wrong = await verifyOtpChallenge("09120001111", "0000");
      expect(wrong.valid).toBe(false);
    }
    const locked = await verifyOtpChallenge("09120001111", "2222");
    expect(locked.valid).toBe(false);
    expect(locked.message).toMatch(/تلاش/);
  });

  it("consumes OTP atomically via DELETE ... code_hash (no TOCTOU select)", async () => {
    mockedUsable.mockReturnValue(true);
    mockedConfigured.mockReturnValue(true);
    mockedExecute.mockResolvedValue({ affectedRows: 1 } as never);

    // Seed memory so hash exists; MySQL atomic path should win.
    mockedUsable.mockReturnValueOnce(false);
    await createOtpChallenge("09125556677", "3456");
    mockedUsable.mockReturnValue(true);

    const result = await verifyOtpChallenge("09125556677", "3456");
    expect(result.valid).toBe(true);
    expect(mockedExecute).toHaveBeenCalled();
    const sql = String(mockedExecute.mock.calls.at(-1)?.[0] ?? "");
    expect(sql).toMatch(/DELETE FROM otp_challenges/i);
    expect(sql).toMatch(/code_hash/i);
    expect(sql).toMatch(/attempts </i);

    // Second verify must fail (memory cleared + MySQL would return 0 rows)
    mockedExecute.mockResolvedValue({ affectedRows: 0 } as never);
    mockedQueryOne.mockResolvedValue(null);
    const replay = await verifyOtpChallenge("09125556677", "3456");
    expect(replay.valid).toBe(false);
  });
});
