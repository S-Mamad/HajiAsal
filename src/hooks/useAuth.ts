"use client";

import { useCallback, useEffect, useState } from "react";
import type { CustomerUser } from "@/types/auth";

export function useAuth() {
  const [user, setUser] = useState<CustomerUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        signal: AbortSignal.timeout(4000),
      });
      if (!res.ok) {
        setUser(null);
        return;
      }
      const data = await res.json();
      setUser(
        data.user
          ? { ...data.user, sellerPanel: data.sellerPanel ?? null }
          : null,
      );
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          signal: AbortSignal.timeout(4000),
        });
        if (!active) return;
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data = await res.json();
        if (!active) return;
        setUser(
          data.user
            ? { ...data.user, sellerPanel: data.sellerPanel ?? null }
            : null,
        );
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.href = "/";
  };

  return { user, loading, refresh, logout, isLoggedIn: Boolean(user) };
}
