export function createPathPrefetchGate() {
  let lastPath: string | null = null;
  return {
    shouldFetch(pathname: string, force = false): boolean {
      if (!force && lastPath === pathname) return false;
      lastPath = pathname;
      return true;
    },
    forget(): void {
      lastPath = null;
    },
  };
}

export function isWithinProximity(
  pointerX: number,
  pointerY: number,
  centerX: number,
  centerY: number,
  radius: number,
): boolean {
  return Math.hypot(pointerX - centerX, pointerY - centerY) <= radius;
}
