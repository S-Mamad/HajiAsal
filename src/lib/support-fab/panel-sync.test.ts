import { describe, expect, it } from "vitest";
import { planPanelOpenSync } from "./panel-sync";

describe("support fab panel open sync", () => {
  it("does nothing when closed", () => {
    expect(
      planPanelOpenSync({
        open: false,
        handshakeFetched: false,
        contextPosted: false,
        identified: true,
      }),
    ).toEqual({ fetchHandshake: false, postContext: false });
  });

  it("fetches once and posts context once for an identified open", () => {
    expect(
      planPanelOpenSync({
        open: true,
        handshakeFetched: false,
        contextPosted: false,
        identified: true,
      }),
    ).toEqual({ fetchHandshake: true, postContext: true });
    expect(
      planPanelOpenSync({
        open: true,
        handshakeFetched: true,
        contextPosted: true,
        identified: true,
      }),
    ).toEqual({ fetchHandshake: false, postContext: false });
  });

  it("posts context after guest identity without a second handshake", () => {
    expect(
      planPanelOpenSync({
        open: true,
        handshakeFetched: true,
        contextPosted: false,
        identified: true,
      }),
    ).toEqual({ fetchHandshake: false, postContext: true });
  });
});
