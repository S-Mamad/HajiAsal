"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  can,
  type AdminPermission,
  type AdminRole,
} from "@/lib/admin/permissions";

interface AdminUserInfo {
  id: string;
  fullName: string;
  email?: string | null;
  phone?: string | null;
  role: AdminRole;
}

interface AdminAuthState {
  loading: boolean;
  authenticated: boolean;
  legacy: boolean;
  user: AdminUserInfo | null;
  role: AdminRole | null;
  can: (permission: AdminPermission) => boolean;
  refresh: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [legacy, setLegacy] = useState(false);
  const [user, setUser] = useState<AdminUserInfo | null>(null);
  const [role, setRole] = useState<AdminRole | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/auth", { credentials: "include" });
      if (!res.ok) {
        setAuthenticated(false);
        setUser(null);
        setRole(null);
        setLegacy(false);
        return;
      }
      const data = await res.json();
      setAuthenticated(Boolean(data.authenticated));
      setLegacy(Boolean(data.legacy));
      setRole((data.role as AdminRole) ?? null);
      setUser(data.user ?? null);
    } catch {
      setAuthenticated(false);
      setUser(null);
      setRole(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo<AdminAuthState>(
    () => ({
      loading,
      authenticated,
      legacy,
      user,
      role,
      can: (permission) => can(role, permission),
      refresh,
    }),
    [loading, authenticated, legacy, user, role, refresh],
  );

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return ctx;
}

export function Can({
  permission,
  children,
  fallback = null,
}: {
  permission: AdminPermission;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { can: canDo } = useAdminAuth();
  if (!canDo(permission)) return <>{fallback}</>;
  return <>{children}</>;
}
