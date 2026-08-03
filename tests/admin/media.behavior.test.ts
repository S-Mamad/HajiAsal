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

vi.mock("@/lib/server/admin-platform-store", () => ({
  listMedia: vi.fn(async () => []),
  createMedia: vi.fn(async (input: Record<string, unknown>) => ({
    id: "m1",
    ...input,
    createdAt: new Date().toISOString(),
  })),
  deleteMedia: vi.fn(async () => true),
}));

vi.mock("@/lib/server/audit-log", () => ({
  logAdminAction: vi.fn(async () => undefined),
}));

vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn(async () => undefined),
  writeFile: vi.fn(async () => undefined),
}));

import { requireAdminPermission } from "@/lib/server/admin-auth";
import { createMedia } from "@/lib/server/admin-platform-store";
import { POST } from "@/app/api/admin/media/route";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

describe("admin media multipart", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.asRole("content");
  });

  it("rejects data URL JSON body", async () => {
    const res = await POST(
      authedAdminRequest("http://localhost/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "x.jpg",
          originalName: "x.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          url: "data:image/jpeg;base64,AAAA",
        }),
      }),
    );
    expect(res.status).toBe(400);
    expect(createMedia).not.toHaveBeenCalled();
  });

  it("accepts public URL JSON body", async () => {
    const res = await POST(
      authedAdminRequest("http://localhost/api/admin/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: "x.jpg",
          originalName: "x.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          url: "https://cdn.example.com/x.jpg",
        }),
      }),
    );
    expect(res.status).toBe(200);
    expect(createMedia).toHaveBeenCalled();
  });

  it("accepts multipart image upload", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    const file = new File([bytes], "photo.jpg", { type: "image/jpeg" });
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "products");

    const res = await POST(
      new Request("http://localhost/api/admin/media", {
        method: "POST",
        headers: { cookie: "hajiasal_admin_session=test" },
        body: form,
      }),
    );
    expect(res.status).toBe(200);
    const json = await readJson(res);
    expect(String((json.item as { url?: string }).url)).toMatch(
      /^\/uploads\/admin\//,
    );
    expect(createMedia).toHaveBeenCalled();
  });

  it("rejects multipart non-image", async () => {
    const file = new File([new Uint8Array([1])], "doc.pdf", {
      type: "application/pdf",
    });
    const form = new FormData();
    form.append("file", file);

    const res = await POST(
      new Request("http://localhost/api/admin/media", {
        method: "POST",
        headers: { cookie: "hajiasal_admin_session=test" },
        body: form,
      }),
    );
    expect(res.status).toBe(400);
    expect(createMedia).not.toHaveBeenCalled();
  });
});
