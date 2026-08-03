import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { can } from "@/lib/admin/permissions";
import {
  ADMIN_API_CATALOG,
  type AdminModuleEndpoint,
} from "./module-catalog";
import {
  installRequireAdminPermissionMock,
  pickDeniedRole,
  authedAdminRequest,
  adminRequest,
} from "./harness";

vi.mock("@/lib/server/admin-auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/admin-auth")>();
  return {
    ...actual,
    requireAdminPermission: vi.fn(),
  };
});

import { requireAdminPermission } from "@/lib/server/admin-auth";

const authMock = installRequireAdminPermissionMock(
  requireAdminPermission as unknown as ReturnType<typeof vi.fn>,
);

function walkAdminRoutes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkAdminRoutes(full, out);
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

function paramsFromPath(apiPath: string): Record<string, string> {
  // /api/admin/products/p1 → { id: "p1" }
  // /api/admin/sellers/s1/withdrawals → { id: "s1" }
  // /api/admin/customers/c1 → { id: "c1" }
  // /api/admin/orders/o1 → { id: "o1" }
  // /api/admin/seller-products/p1 → { id: "p1" }
  const parts = apiPath.split("/").filter(Boolean);
  // api admin <resource> <id> ...
  if (parts[0] === "api" && parts[1] === "admin" && parts.length >= 4) {
    const maybeId = parts[3];
    if (
      maybeId &&
      !["export", "import", "bulk"].includes(maybeId) &&
      parts[2] !== "dashboard"
    ) {
      return { id: maybeId };
    }
  }
  return {};
}

async function invokeEndpoint(
  ep: AdminModuleEndpoint,
  request: Request,
): Promise<Response> {
  const mod = await import(/* @vite-ignore */ ep.importPath);
  const handler = mod[ep.method] as
    | ((req: Request, ctx?: { params: Promise<Record<string, string>> }) => Promise<Response>)
    | undefined;
  if (!handler) {
    throw new Error(`Handler ${ep.method} missing on ${ep.importPath}`);
  }
  const params = paramsFromPath(ep.path);
  if (Object.keys(params).length > 0) {
    return handler(request, { params: Promise.resolve(params) });
  }
  return handler(request);
}

function buildRequest(ep: AdminModuleEndpoint, withCookie: boolean): Request {
  const init: RequestInit = { method: ep.method };
  if (ep.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(ep.body);
  }
  const url = `http://localhost${ep.path}`;
  return withCookie
    ? authedAdminRequest(url, init)
    : adminRequest(url, { ...init, cookie: null });
}

describe("admin API static gate presence", () => {
  it("every admin route.ts except auth imports/calls gateAdmin", () => {
    const root = path.join(process.cwd(), "src/app/api/admin");
    const files = walkAdminRoutes(root).filter(
      (f) => !f.replace(/\\/g, "/").includes("/auth/"),
    );
    expect(files.length).toBeGreaterThan(20);

    const ungated: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("gateAdmin")) {
        ungated.push(path.relative(process.cwd(), file));
      }
    }
    expect(ungated).toEqual([]);
  });

  it("catalog covers all gated modules from filesystem (spot check count)", () => {
    expect(ADMIN_API_CATALOG.length).toBeGreaterThanOrEqual(50);
    const modules = new Set(ADMIN_API_CATALOG.map((e) => e.module));
    for (const required of [
      "dashboard",
      "products",
      "orders",
      "customers",
      "sellers",
      "content",
      "settings",
      "users",
    ]) {
      expect(modules.has(required)).toBe(true);
    }
  });
});

describe("admin API RBAC matrix (401/403)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const ep of ADMIN_API_CATALOG) {
    describe(ep.id, () => {
      it("returns 401 when unauthenticated", async () => {
        authMock.asUnauthenticated();
        const res = await invokeEndpoint(ep, buildRequest(ep, false));
        expect(res.status).toBe(401);
      });

      it("returns 403 for a role lacking permission", async () => {
        const denied = pickDeniedRole(ep.permission);
        if (!denied) {
          // Only super_admin has this permission — skip 403 case
          expect(can("super_admin", ep.permission)).toBe(true);
          return;
        }
        authMock.asRole(denied);
        const res = await invokeEndpoint(ep, buildRequest(ep, true));
        expect(res.status).toBe(403);
      });

      it("does not return 401/403 for super_admin (gate opens)", async () => {
        if (ep.skipAllowedProbe) {
          // Avoid side effects (FS/DB writes) on heavy mutates; 401/403 cases above cover the gate.
          expect(can("super_admin", ep.permission)).toBe(true);
          return;
        }
        authMock.asRole("super_admin");
        const res = await invokeEndpoint(ep, buildRequest(ep, true));
        expect([401, 403]).not.toContain(res.status);
      });
    });
  }
});
