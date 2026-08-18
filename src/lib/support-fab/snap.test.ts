import { describe, expect, it } from "vitest";
import {
  clampOffsetBottom,
  isPastDragThreshold,
  isPrimaryPointerRelease,
  liveFabOrigin,
  nearestSnapSide,
  offsetBottomAfterDrag,
  parseSnapState,
  snapFromDragRelease,
} from "./snap";

describe("support fab snap physics", () => {
  it("follows the pointer during drag without snapping", () => {
    expect(
      liveFabOrigin({
        originLeft: 400,
        originTop: 500,
        deltaX: -120,
        deltaY: -40,
      }),
    ).toEqual({ left: 280, top: 460 });
  });

  it("ignores jitter below the drag threshold", () => {
    expect(isPastDragThreshold(3, 4, 8)).toBe(false);
    expect(isPastDragThreshold(6, 6, 8)).toBe(true);
  });

  it("snaps to the nearest edge only from the release point", () => {
    expect(nearestSnapSide(90, 400)).toBe("left");
    expect(nearestSnapSide(210, 400)).toBe("right");
  });

  it("commits magnetic snap from a Motion drag release", () => {
    expect(
      snapFromDragRelease({
        releaseX: 40,
        deltaY: -40,
        originRectBottom: 700,
        originOffsetBottom: 0,
        viewportWidth: 400,
        viewportHeight: 800,
        fabSize: 56,
        edgeGap: 20,
        topReserve: 80,
      }),
    ).toEqual({ side: "left", offsetBottom: 40 });
  });

  it("keeps vertical offset relative to the rest clearance", () => {
    expect(
      offsetBottomAfterDrag({
        originRectBottom: 700,
        originOffsetBottom: 0,
        deltaY: -40,
        viewportHeight: 800,
        fabSize: 56,
        edgeGap: 20,
        topReserve: 80,
      }),
    ).toBe(40);
  });

  it("clamps so the FAB cannot leave the viewport", () => {
    expect(clampOffsetBottom(-20, 800, 56, 20, 80)).toBe(0);
    expect(clampOffsetBottom(900, 800, 56, 20, 80)).toBe(800 - 80 - 56 - 40);
  });

  it("treats mouse left-click and any touch as a primary release", () => {
    expect(isPrimaryPointerRelease({ button: 0, pointerType: "mouse" })).toBe(true);
    expect(isPrimaryPointerRelease({ button: 2, pointerType: "mouse" })).toBe(false);
    expect(isPrimaryPointerRelease({ button: -1, pointerType: "touch" })).toBe(true);
  });

  it("parses stored snap state", () => {
    expect(parseSnapState('{"side":"left","offsetBottom":80}')).toEqual({
      side: "left",
      offsetBottom: 80,
    });
    expect(parseSnapState("nope")).toBeNull();
  });
});
