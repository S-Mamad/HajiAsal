/**
 * Cloudflare Worker: Telegram Bot API reverse proxy.
 *
 * Why: Iranian hosts often cannot reach api.telegram.org outbound.
 * This Worker (runs on Cloudflare edge) forwards Bot API calls.
 *
 * URL shape (same as official Bot API):
 *   https://<worker>/bot<TOKEN>/<method>
 * → https://api.telegram.org/bot<TOKEN>/<method>
 *
 * Optional secret: set Worker secret PROXY_SECRET, then clients must send
 * header X-Telegram-Proxy-Secret: <PROXY_SECRET>
 */
export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(),
      });
    }

    const url = new URL(request.url);

    if (url.pathname === "/" || url.pathname === "/health") {
      return json(
        {
          ok: true,
          service: "hajiasal-telegram-proxy",
          usage: "/bot<TOKEN>/<method>",
        },
        200,
      );
    }

    const expected = String(env.PROXY_SECRET || "").trim();
    if (expected) {
      const got =
        request.headers.get("x-telegram-proxy-secret") ||
        url.searchParams.get("proxy_secret") ||
        "";
      if (got !== expected) {
        return json({ ok: false, error: "unauthorized" }, 401);
      }
    }

    // Only Bot API paths: /bot<token>/<method>
    if (!/^\/bot[^/]+\//.test(url.pathname)) {
      return json(
        {
          ok: false,
          error: "not_found",
          hint: "Use /bot<TOKEN>/<method> like the official Telegram Bot API",
        },
        404,
      );
    }

    const forwardSearch = new URLSearchParams(url.searchParams);
    forwardSearch.delete("proxy_secret");
    const qs = forwardSearch.toString();
    const target = `https://api.telegram.org${url.pathname}${qs ? `?${qs}` : ""}`;

    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("cf-connecting-ip");
    headers.delete("cf-ipcountry");
    headers.delete("cf-ray");
    headers.delete("cf-visitor");
    headers.delete("x-forwarded-for");
    headers.delete("x-forwarded-proto");
    headers.delete("x-real-ip");
    headers.delete("x-telegram-proxy-secret");

    /** @type {RequestInit} */
    const init = {
      method: request.method,
      headers,
      redirect: "follow",
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = await request.arrayBuffer();
    }

    try {
      const upstream = await fetch(target, init);
      const outHeaders = new Headers(upstream.headers);
      for (const [k, v] of Object.entries(corsHeaders())) {
        outHeaders.set(k, v);
      }
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return json({ ok: false, error: "upstream_failed", message }, 502);
    }
  },
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Telegram-Proxy-Secret, Authorization",
  };
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...corsHeaders(),
    },
  });
}
