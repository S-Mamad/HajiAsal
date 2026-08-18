export type FabSnapSide = "left" | "right";

export type FabSnapState = {
  side: FabSnapSide;
  offsetBottom: number;
};

export function nearestSnapSide(
  x: number,
  viewportWidth: number,
): FabSnapSide {
  return x < viewportWidth / 2 ? "left" : "right";
}

export function clampOffsetBottom(
  offsetBottom: number,
  viewportHeight: number,
  fabSize: number,
  edgeGap: number,
  topReserve: number,
): number {
  const max = Math.max(
    0,
    viewportHeight - topReserve - fabSize - edgeGap * 2,
  );
  return Math.min(Math.max(0, offsetBottom), max);
}

export function isPastDragThreshold(
  dx: number,
  dy: number,
  threshold: number,
): boolean {
  return Math.hypot(dx, dy) >= threshold;
}

export function isPrimaryPointerRelease(event: {
  button: number;
  pointerType: string;
}): boolean {
  if (event.pointerType === "mouse") return event.button === 0;
  return true;
}

export function liveFabOrigin(input: {
  originLeft: number;
  originTop: number;
  deltaX: number;
  deltaY: number;
}): { left: number; top: number } {
  return {
    left: input.originLeft + input.deltaX,
    top: input.originTop + input.deltaY,
  };
}

export function offsetBottomAfterDrag(input: {
  originRectBottom: number;
  originOffsetBottom: number;
  deltaY: number;
  viewportHeight: number;
  fabSize: number;
  edgeGap: number;
  topReserve: number;
}): number {
  const originClearance = input.viewportHeight - input.originRectBottom;
  const baseClearance = originClearance - input.originOffsetBottom;
  const newClearance =
    input.viewportHeight - (input.originRectBottom + input.deltaY);
  return clampOffsetBottom(
    newClearance - baseClearance,
    input.viewportHeight,
    input.fabSize,
    input.edgeGap,
    input.topReserve,
  );
}

export function snapFromDragRelease(input: {
  releaseX: number;
  deltaY: number;
  originRectBottom: number;
  originOffsetBottom: number;
  viewportWidth: number;
  viewportHeight: number;
  fabSize: number;
  edgeGap: number;
  topReserve: number;
}): FabSnapState {
  return {
    side: nearestSnapSide(input.releaseX, input.viewportWidth),
    offsetBottom: offsetBottomAfterDrag({
      originRectBottom: input.originRectBottom,
      originOffsetBottom: input.originOffsetBottom,
      deltaY: input.deltaY,
      viewportHeight: input.viewportHeight,
      fabSize: input.fabSize,
      edgeGap: input.edgeGap,
      topReserve: input.topReserve,
    }),
  };
}

export function parseSnapState(raw: string | null): FabSnapState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<FabSnapState>;
    if (parsed.side !== "left" && parsed.side !== "right") return null;
    const offsetBottom =
      typeof parsed.offsetBottom === "number" &&
      Number.isFinite(parsed.offsetBottom)
        ? parsed.offsetBottom
        : 0;
    return { side: parsed.side, offsetBottom };
  } catch {
    return null;
  }
}
