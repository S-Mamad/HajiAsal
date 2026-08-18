import { describe, expect, it } from "vitest";
import { clientReplaceRedirect } from "@/lib/server/payment-return-redirect";

describe("clientReplaceRedirect", () => {
  it("returns HTML that replaces history instead of 302", async () => {
    const res = clientReplaceRedirect(
      "https://hajiasal.ir/checkout?payment=cancelled&orderId=ord-1",
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    const body = await res.text();
    expect(body).toContain("location.replace");
    expect(body).toContain("payment=cancelled");
    expect(body).toContain("ord-1");
  });
});
