import { NextResponse } from "next/server";

/**
 * Return an HTML document that navigates with location.replace.
 * HTTP 302 leaves the payment gateway in history so Back re-opens it;
 * replace swaps the verify entry for the storefront destination.
 */
export function clientReplaceRedirect(absoluteUrl: string): NextResponse {
  const href = absoluteUrl.trim();
  if (!/^https?:\/\//i.test(href)) {
    return NextResponse.redirect(href);
  }

  const forAttr = href.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const html = `<!DOCTYPE html><html lang="fa"><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>بازگشت از درگاه</title><script>location.replace(${JSON.stringify(href)});</script><meta http-equiv="refresh" content="0;url=${forAttr}"/></head><body dir="rtl" style="font-family:Tahoma,sans-serif;padding:2rem;text-align:center;background:#fafafa;color:#1c1917"><p>در حال بازگشت به فروشگاه…</p><p><a href="${forAttr}">ادامه</a></p></body></html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
