import { describe, expect, it } from "vitest";
import { readCookieValue } from "./cookie-value";

describe("readCookieValue", () => {
  it("reads the exact cookie name", () => {
    expect(
      readCookieValue(
        "hajiasal_customer_session=abc; other=1",
        "hajiasal_customer_session",
      ),
    ).toBe("abc");
  });

  it("does not match a prefix/suffix name", () => {
    expect(
      readCookieValue(
        "xhajiasal_customer_session=evil; hajiasal_customer_session=good",
        "hajiasal_customer_session",
      ),
    ).toBe("good");
    expect(
      readCookieValue(
        "xhajiasal_customer_session=evil",
        "hajiasal_customer_session",
      ),
    ).toBeNull();
  });

  it("decodes URI-encoded values", () => {
    expect(
      readCookieValue("tok=a%2Eb", "tok"),
    ).toBe("a.b");
  });
});
