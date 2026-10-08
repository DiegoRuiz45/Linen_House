/* oxlint-disable react/only-export-components */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { apiRequest } from "./api";


const AuthContext = createContext(null);


export function AdminAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const current = await apiRequest("/auth/me");
      setUser(current);
      return current;
    } catch (error) {
      if (error?.status === 401 || error?.status === 403) {
        setUser(null);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    // La sesión HTTP es una fuente externa que se sincroniza al montar.
    // oxlint-disable-next-line react/set-state-in-effect
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    setUser,
    refresh,
    logout,
  }), [loading, logout, refresh, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}


export function useAdminAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAdminAuth debe utilizarse dentro de AdminAuthProvider.");
  }
  return context;
}
