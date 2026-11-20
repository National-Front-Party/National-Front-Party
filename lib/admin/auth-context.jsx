"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { adminFetch, setApiAuthHandlers } from "./api.js";

const AdminAuthContext = createContext({
  user: null,
  status: "loading", // 'loading' | 'authenticated' | 'anonymous'
  login: async () => {},
  logout: async () => {},
  refresh: async () => {},
});

export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const router = useRouter();
  const pathname = usePathname();

  const handleUnauthenticated = useCallback(() => {
    setUser(null);
    setStatus("anonymous");
    if (pathname && !pathname.startsWith("/admin/login")) {
      const nextParam = encodeURIComponent(pathname);
      router.push(`/admin/login?next=${nextParam}&reason=expired`);
    }
  }, [pathname, router]);

  const handlePasswordChangeRequired = useCallback(() => {
    if (pathname !== "/admin/change-password") {
      router.push("/admin/change-password");
    }
  }, [pathname, router]);

  useEffect(() => {
    setApiAuthHandlers({
      onUnauthenticated: handleUnauthenticated,
      onPasswordChangeRequired: handlePasswordChangeRequired,
    });
  }, [handleUnauthenticated, handlePasswordChangeRequired]);

  const refresh = useCallback(async () => {
    try {
      const data = await adminFetch("/api/admin/auth/me", {
        skipAuthRedirect: true,
      });
      if (data && data.email) {
        setUser({
          fullName: data.fullName,
          email: data.email,
          role: data.role,
          mustChangePassword: Boolean(data.mustChangePassword),
        });
        setStatus("authenticated");
        return data;
      }
      setUser(null);
      setStatus("anonymous");
      return null;
    } catch {
      setUser(null);
      setStatus("anonymous");
      return null;
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    adminFetch("/api/admin/auth/me", { skipAuthRedirect: true })
      .then((data) => {
        if (ignore) return;
        if (data && data.email) {
          setUser({
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            mustChangePassword: Boolean(data.mustChangePassword),
          });
          setStatus("authenticated");
        } else {
          setUser(null);
          setStatus("anonymous");
        }
      })
      .catch(() => {
        if (ignore) return;
        setUser(null);
        setStatus("anonymous");
      });

    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(
    async ({ email, password }) => {
      const result = await adminFetch("/api/admin/auth/login", {
        method: "POST",
        body: { email, password },
        skipAuthRedirect: true,
      });

      // Fetch user profile immediately
      const profile = await refresh();
      return {
        ...result,
        mustChangePassword:
          result?.mustChangePassword ?? profile?.mustChangePassword ?? false,
      };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    try {
      await adminFetch("/api/admin/auth/logout", {
        method: "POST",
        skipAuthRedirect: true,
      });
    } catch {
      // Clean state regardless of network/server response
    } finally {
      setUser(null);
      setStatus("anonymous");
      router.push("/admin/login?reason=logout");
    }
  }, [router]);

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        status,
        login,
        logout,
        refresh,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  return useContext(AdminAuthContext);
}
