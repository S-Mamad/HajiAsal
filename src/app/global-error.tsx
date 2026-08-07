"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[hajiasal] global error:", error);
  }, [error]);

  return (
    <html lang="fa" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          fontFamily: "Vazirmatn, Tahoma, sans-serif",
          background: "#f3f1ec",
          color: "#1c1917",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, fontSize: "0.875rem", color: "#a16207" }}>
          خطای سیستمی
        </p>
        <h1
          style={{
            margin: "0.5rem 0 0",
            fontSize: "1.25rem",
            fontWeight: 600,
          }}
        >
          اپلیکیشن با مشکل مواجه شد
        </h1>
        <p
          style={{
            margin: "0.75rem 0 0",
            maxWidth: "22rem",
            fontSize: "0.875rem",
            lineHeight: 1.7,
            color: "#57534e",
          }}
        >
          یک خطای غیرمنتظره رخ داد. صفحه را دوباره بارگذاری کنید. اگر ادامه داشت،
          بعداً دوباره امتحان کنید.
        </p>
        {error.digest ? (
          <p
            style={{
              margin: "0.5rem 0 0",
              fontFamily: "ui-monospace, monospace",
              fontSize: "0.7rem",
              color: "#a8a29e",
            }}
            dir="ltr"
          >
            کد: {error.digest}
          </p>
        ) : null}
        <div
          style={{
            marginTop: "1.75rem",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              border: "none",
              borderRadius: "0.75rem",
              background: "#a16207",
              color: "#fffbeb",
              fontSize: "0.875rem",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            تلاش مجدد
          </button>
          <a
            href="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.75rem",
              border: "1px solid #d6d3d1",
              background: "#fff",
              color: "#1c1917",
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            صفحه اصلی
          </a>
        </div>
      </body>
    </html>
  );
}
