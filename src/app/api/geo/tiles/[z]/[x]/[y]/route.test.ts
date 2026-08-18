import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/session", () => ({
  getSessionFromRequest: vi.fn(),
}));

import { getSessionFromRequest } from "@/lib/auth/session";
import { GET } from "./route";

describe("GET /api/geo/tiles", () => {
  beforeEach(() => {
    vi.mocked(getSessionFromRequest).mockReset();
  });

  it("rejects unauthenticated tile requests", async () => {
    vi.mocked(getSessionFromRequest).mockReturnValue(null);
    const res = await GET(
      new Request("http://localhost/api/geo/tiles/3/1/1"),
      { params: Promise.resolve({ z: "3", x: "1", y: "1" }) },
    );
    expect(res.status).toBe(401);
  });

  it("rejects path traversal disguised as tile coords", async () => {
    vi.mocked(getSessionFromRequest).mockReturnValue({
      userId: "u1",
      phone: "09120000000",
      fullName: null,
      exp: Date.now() + 60_000,
    });
    const res = await GET(
      new Request("http://localhost/api/geo/tiles/3/../8/1"),
      { params: Promise.resolve({ z: "3", x: "../8", y: "1" }) },
    );
    expect(res.status).toBe(400);
    expect(vi.mocked(getSessionFromRequest)).toHaveBeenCalled();
  });
});
