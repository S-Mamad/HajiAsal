import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  installRequireAdminPermissionMock,
  authedAdminRequest,
  readJson,
} from "./harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    requireAdminPermission: vi.fn(),
  };
});

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("@/lib/server/telegram-notify", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@/lib/server/telegram-notify")>();
  return {
    ...actual,
    isTelegramNotifyEnabled: vi.fn(() => true),
    getTelegramAdminChatIds: vi.fn(() => ["1", "2"]),
    sendTelegramAdminTestPing: vi.fn(async () => ({
      sent: true,
      chatCount: 2,
    })),
  };
});

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { sendTelegramAdminTestPing } from "@/lib/server/telegram-notify";
import { GET, POST } from "@/app/api/admin/telegram/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("admin telegram test endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET status for settings.view", async () => {
    authMock.asRole("super_admin");
    const res = await GET(
      authedAdminRequest("http://localhost/api/admin/telegram"),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.enabled).toBe(true);
    expect(json.chatCount).toBe(2);
    expect(json).not.toHaveProperty("token");
  });

  it("POST ping for settings.edit", async () => {
    authMock.asRole("super_admin");
    const res = await POST(
      authedAdminRequest("http://localhost/api/admin/telegram", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(json.sent).toBe(true);
    expect(sendTelegramAdminTestPing).toHaveBeenCalled();
  });

  it("denies warehouse without settings.edit", async () => {
    authMock.asRole("warehouse");
    const res = await POST(
      authedAdminRequest("http://localhost/api/admin/telegram", {
        method: "POST",
      }),
    );
    expect(res.status).toBe(403);
  });
});
