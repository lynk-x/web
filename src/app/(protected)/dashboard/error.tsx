"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error("[DashboardError]", error);
  }, [error]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        padding: "2rem",
        textAlign: "center",
        color: "#e5e5e5",
      }}
    >
      <h2 style={{ fontSize: "1.25rem", fontWeight: 600 }}>
        This page encountered an error
      </h2>
      <p style={{ color: "#888", maxWidth: "420px" }}>
        The rest of your dashboard is still accessible. You can try reloading
        this page or navigate back.
      </p>
      {error.digest && (
        <p style={{ fontSize: "0.75rem", color: "#555" }}>
          Error ID: {error.digest}
        </p>
      )}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          onClick={reset}
          style={{
            padding: "0.55rem 1.25rem",
            background: "#22c55e",
            color: "#000",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Try again
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          style={{
            padding: "0.55rem 1.25rem",
            background: "transparent",
            color: "#e5e5e5",
            border: "1px solid #333",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "0.875rem",
          }}
        >
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
