import path from "node:path";

/**
 * Resolve a public upload URL to an absolute path under `public/`,
 * rejecting traversal. `urlPrefix` is the required URL prefix
 * (e.g. `/uploads/seller/`).
 */
export function resolvePublicUploadPath(
  url: string,
  urlPrefix: string,
): string | null {
  if (!url.startsWith(urlPrefix) || url.startsWith("//")) return null;
  if (url.includes("\0") || url.includes("\\") || url.includes("..")) {
    return null;
  }
  const cwd = process.cwd();
  const publicRoot = path.resolve(cwd, "public");
  const prefixRoot = path.resolve(
    publicRoot,
    urlPrefix.replace(/^\//, ""),
  );
  const target = path.resolve(publicRoot, url.replace(/^\//, ""));
  const rootWithSep = prefixRoot.endsWith(path.sep)
    ? prefixRoot
    : `${prefixRoot}${path.sep}`;
  if (target !== prefixRoot && !target.startsWith(rootWithSep)) {
    return null;
  }
  return target;
}
