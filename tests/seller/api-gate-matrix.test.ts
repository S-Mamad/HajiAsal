import { beforeEach, describe, expect, it, vi } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import {
  SELLER_API_CATALOG,
  type SellerModuleEndpoint,
} from "./module-catalog";
import {
  installGetSellerFromRequestMock,
  authedSellerRequest,
  sellerRequest,
} from "./harness";

vi.mock("@/lib/server/sellers", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/sellers")>();
  return {
    ...actual,
    getSellerFromRequest: vi.fn(),
  };
});

import { getSellerFromRequest } from "@/lib/server/sellers";

const sellerMock = installGetSellerFromRequestMock(
  getSellerFromRequest as unknown as ReturnType<typeof vi.fn>,
);

function walkSellerRoutes(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walkSellerRoutes(full, out);
    else if (name === "route.ts") out.push(full);
  }
  return out;
}

function paramsFromPath(apiPath: string): Record<string, string> {
  const parts = apiPath.split("/").filter(Boolean);
  // /api/seller/tickets/t1 → { id: "t1" }
  if (
    parts[0] === "api" &&
    parts[1] === "seller" &&
    parts[2] === "tickets" &&
    parts[3] &&
    !parts[3].includes("?")
  ) {
    return { id: parts[3].split("?")[0]! };
  }
  return {};
}

async function invokeEndpoint(
  ep: SellerModuleEndpoint,
  request: Request,
): Promise<Response> {
  const mod = await import(/* @vite-ignore */ ep.importPath);
  const handler = mod[ep.method] as
    | ((
        req: Request,
        ctx?: { params: Promise<Record<string, string>> },
      ) => Promise<Response>)
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

function buildRequest(ep: SellerModuleEndpoint, withCookie: boolean): Request {
  const init: RequestInit = { method: ep.method };
  if (ep.body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(ep.body);
  }
  const url = `http://localhost${ep.path}`;
  return withCookie
    ? authedSellerRequest(url, init)
    : sellerRequest(url, { ...init, cookie: null });
}

describe("seller API static gate presence", () => {
  it("every seller route.ts except auth imports/calls gateSeller", () => {
    const root = path.join(process.cwd(), "src/app/api/seller");
    const files = walkSellerRoutes(root).filter((f) => {
      const norm = f.replace(/\\/g, "/");
      return !norm.includes("/auth/") && !norm.includes("/apply/");
    });
    expect(files.length).toBeGreaterThan(15);

    const ungated: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      if (!src.includes("gateSeller")) {
        ungated.push(path.relative(process.cwd(), file));
      }
    }
    expect(ungated).toEqual([]);
  });

  it("catalog covers core seller modules", () => {
    expect(SELLER_API_CATALOG.length).toBeGreaterThanOrEqual(30);
    const modules = new Set(SELLER_API_CATALOG.map((e) => e.module));
    for (const required of [
      "dashboard",
      "products",
      "orders",
      "wallet",
      "tickets",
      "inventory",
      "discounts",
      "profile",
      "media",
    ]) {
      expect(modules.has(required)).toBe(true);
    }
  });
});

describe("seller API gate matrix (401/403)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  for (const ep of SELLER_API_CATALOG) {
    describe(ep.id, () => {
      it("returns 401 when unauthenticated", async () => {
        sellerMock.asUnauthenticated();
        const res = await invokeEndpoint(ep, buildRequest(ep, false));
        expect(res.status).toBe(401);
      });

      it("returns 403 when seller is inactive", async () => {
        sellerMock.asInactive();
        const res = await invokeEndpoint(ep, buildRequest(ep, true));
        expect(res.status).toBe(403);
      });

      it("returns 403 when capability is denied", async () => {
        if (!ep.capability) {
          // Auth-only endpoints: active seller with empty overrides still passes
          sellerMock.asSeller({ capabilities: {} });
          const res = await invokeEndpoint(ep, buildRequest(ep, true));
          expect([401, 403]).not.toContain(res.status);
          return;
        }
        sellerMock.asSellerWithout(ep.anyOfCapabilities ?? ep.capability);
        const res = await invokeEndpoint(ep, buildRequest(ep, true));
        expect(res.status).toBe(403);
      });

      it("does not return 401/403 for active allowed seller (gate opens)", async () => {
        if (ep.capability === "discounts.manage") {
          sellerMock.asSeller({
            capabilities: { "discounts.manage": true },
          });
        } else {
          sellerMock.asSeller();
        }
        const res = await invokeEndpoint(ep, buildRequest(ep, true));
        expect([401, 403]).not.toContain(res.status);
      });
    });
  }
});
