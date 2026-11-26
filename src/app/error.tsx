"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Root segment error boundary rendered inside RootLayout when an unhandled
 * runtime error occurs on a route.
 */
export default function RouteError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[RouteError]", error);
  }, [error]);

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#e5e5e5",
        fontFamily: "var(--font-primary), system-ui, sans-serif",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.75rem", fontWeight: 700, fontFamily: "var(--font-heading), system-ui, sans-serif" }}>
        Something went wrong
      </h1>
      <p style={{ color: "#888", maxWidth: "480px" }}>
        An unexpected error occurred. If the problem persists, please contact support.
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.75rem", color: "#555" }}>
          Error ID: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap", justifyContent: "center" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.65rem 1.4rem",
            background: "var(--color-brand-primary, #20f928)",
            color: "#000",
            border: "none",
            borderRadius: "9999px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "0.9rem",
          }}
        >
          Try again
        </button>
        <Link
          href="/"
          style={{
            padding: "0.65rem 1.4rem",
            background: "rgba(255,255,255,0.08)",
            color: "#fff",
            border: "1px solid rgba(255,255,255,0.16)",
            borderRadius: "9999px",
            fontWeight: 600,
            fontSize: "0.9rem",
          }}
        >
          Back to Home
        </Link>
      </div>
    </main>
  );
}
