"use client";

import { useState, useEffect, useCallback } from "react";

const PING_INTERVAL = 30_000; // 30 seconds
const PING_TIMEOUT = 5_000;   // 5 second timeout for health check

/**
 * Hook that monitors connection to the Mission Control API server.
 *
 * Detects both:
 * - Browser offline (navigator.onLine === false)
 * - Server unreachable (API health check fails)
 *
 * Returns `online: false` when either condition is detected.
 */
export function useConnection() {
  const [online, setOnline] = useState(true);
  const [checking, setChecking] = useState(false);

  const checkConnection = useCallback(async () => {
    // Don't overlap checks
    if (checking) return;
    setChecking(true);

    try {
      // Browser says we're offline — no point pinging
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setOnline(false);
        return;
      }

      // Lightweight HEAD request to the dashboard endpoint
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), PING_TIMEOUT);

      try {
        const res = await fetch("/api/dashboard", {
          method: "HEAD",
          signal: controller.signal,
          // Skip auth + retry — this is a raw connectivity check
        });
        clearTimeout(timeout);
        setOnline(res.ok || res.status < 500);
      } catch {
        clearTimeout(timeout);
        setOnline(false);
      }
    } finally {
      setChecking(false);
    }
  }, [checking]);

  useEffect(() => {
    // Browser online/offline events (fast detection for network drops)
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    // Periodic server health check (catches dev server restarts)
    const interval = setInterval(checkConnection, PING_INTERVAL);

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [checkConnection]);

  return { online };
}
